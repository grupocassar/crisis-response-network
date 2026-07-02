const fs = require('fs');

// Configuración
const ARCHIVO_ENTRADA = 'data_interceptada_67020.json';
const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';
const FILAS_POR_LOTE = 5000; // Lotes de 5000 para generar ~13 archivos en vez de demasiados
const REGISTROS_POR_INSERT = 500;

// Filtro anti-sabotaje (bromas comunes de internet)
const PALABRAS_NEGRAS = [
    'elver galarga', 'rosa melano', 'benito camelas', 'debora melo', 
    'lomas turbas', 'paco gerte', 'aquiles castro', 'elmer curio',
    'aitor tilla', 'test', 'prueba', 'troll', 'asd', 'fgh'
];

function escapeSql(str) {
    if (!str) return 'NULL';
    return "'" + String(str).replace(/'/g, "''").trim() + "'";
}

// Mapeo inteligente de estados adaptado a los datos en español/inglés
function mapStatus(status) {
    if (!status) return 'buscado';
    const s = String(status).toLowerCase();
    if (s.includes('missing') || s.includes('buscado') || s.includes('desaparecido') || s.includes('sin-contacto')) return 'buscado';
    if (s.includes('deceased') || s.includes('fallecido') || s.includes('muerto')) return 'fallecido';
    if (s.includes('found') || s.includes('a_salvo') || s.includes('encontrado')) return 'a_salvo';
    if (s.includes('hospital') || s.includes('herido') || s.includes('clinica')) return 'herido';
    return 'buscado';
}

// Función dinámica para extraer valores sin importar cómo se llame exactamente la llave
function extraerValor(obj, posiblesLlaves) {
    for (let key of posiblesLlaves) {
        if (obj[key] !== undefined && obj[key] !== null) {
            return String(obj[key]).trim();
        }
    }
    return '';
}

function procesarJSON() {
    console.log("==================================================================");
    console.log("🚀 LEYENDO LA MEGA DATA JSON (67K REGISTROS - 40 MB) 🚀");
    console.log("==================================================================");

    if (!fs.existsSync(ARCHIVO_ENTRADA)) {
        console.error(`❌ ERROR: No se encuentra el archivo '${ARCHIVO_ENTRADA}'. Revisa el nombre.`);
        process.exit(1);
    }

    // 1. Leer y parsear el JSON masivo directamente en RAM
    let data;
    try {
        const fileContent = fs.readFileSync(ARCHIVO_ENTRADA, 'utf-8');
        data = JSON.parse(fileContent);
        // Manejar si el JSON envuelve la data en un objeto o si es el array directo
        if (data.items) data = data.items;
        else if (data.data) data = data.data;
    } catch (e) {
        console.error("❌ ERROR AL PARSEAR JSON. El archivo podría estar corrupto o incompleto:", e.message);
        process.exit(1);
    }

    if (!Array.isArray(data) || data.length === 0) {
        console.log("⚠️ El JSON no contiene un arreglo válido de personas.");
        return;
    }

    console.log(`✅ JSON cargado en memoria con éxito. Analizando ${data.length} objetos...\n`);

    let totalProcesados = 0;
    let totalDescartados = 0;
    let recordsList = [];
    let nombresUnicos = new Set();

    for (let persona of data) {
        // Extracción adaptativa (busca las llaves según lo que reportaste)
        const nombre = extraerValor(persona, ['nombre', 'firstName', 'name', 'nombres']);
        const apellido = extraerValor(persona, ['apellido', 'lastName', 'apellidos']);
        let fullName = `${nombre} ${apellido}`.trim().replace(/"/g, '');

        // Filtro de Seguridad
        if (!fullName || 
            fullName.includes('{') || 
            fullName.includes('[') || 
            fullName.includes(':') ||
            fullName.length > 70 ||
            fullName.length < 3) {
            totalDescartados++;
            continue;
        }

        // Filtro Anti-Troll
        const nameLower = fullName.toLowerCase();
        const esTroll = PALABRAS_NEGRAS.some(troll => nameLower.includes(troll));
        if (esTroll) {
            totalDescartados++;
            continue;
        }

        // Evitar duplicados exactos dentro del mismo lote
        if (nombresUnicos.has(nameLower)) {
            totalDescartados++;
            continue;
        }
        nombresUnicos.add(nameLower);

        const documentId = extraerValor(persona, ['cedula', 'idNumber', 'doc', 'ci', 'documento']);
        const statusStr = extraerValor(persona, ['estado_reportado', 'status', 'estado', 'condicion']);
        const status = mapStatus(statusStr);
        
        let location = extraerValor(persona, ['hospital_centro', 'location', 'ubicacion', 'lastSeen', 'hospital']);
        if (!location) location = 'No especificada';
        location = location.replace(/(\r\n|\n|\r)/gm, " - ").replace(/"/g, '').trim();

        // Construir información del reportero (si existe)
        const reporterInfo = extraerValor(persona, ['reporter', 'contacto', 'reportado_por']) || 'Plataforma Oficial Desaparecidos (67k)';

        recordsList.push({
            name: fullName,
            doc: documentId ? documentId.replace(/"/g, '').trim() : null,
            status: status,
            loc: location,
            rep: reporterInfo
        });

        totalProcesados++;
    }

    console.log(`📊 Análisis final completado:`);
    console.log(`   - Registros limpios y puros listos para inyección: ${totalProcesados}`);
    console.log(`   - Duplicados, trolls o datos inválidos bloqueados: ${totalDescartados}`);

    // 2. Generación de Lotes SQL
    const totalLotes = Math.ceil(recordsList.length / FILAS_POR_LOTE);
    console.log(`\n📦 Creando ${totalLotes} lotes de importación para Supabase...`);

    for (let loteIdx = 0; loteIdx < totalLotes; loteIdx++) {
        const inicio = loteIdx * FILAS_POR_LOTE;
        const fin = Math.min(inicio + FILAS_POR_LOTE, recordsList.length);
        const loteRecords = recordsList.slice(inicio, fin);
        
        const sqlStatements = [];
        sqlStatements.push(`-- =====================================================================`);
        sqlStatements.push(`-- LOTE GIGANTE #${loteIdx + 1} DE LA BASE DE DATOS DE 67K (JSON)`);
        sqlStatements.push(`-- =====================================================================\n`);

        for (let j = 0; j < loteRecords.length; j += REGISTROS_POR_INSERT) {
            const chunk = loteRecords.slice(j, j + REGISTROS_POR_INSERT);
            
            sqlStatements.push(`INSERT INTO persons (incident_id, name_desc, document_id, status, location_text, reporter_contact, trust_level) VALUES`);
            
            const values = chunk.map((r, cIdx) => {
                const isLast = cIdx === chunk.length - 1;
                return `('${INCIDENT_ID}', ${escapeSql(r.name)}, ${r.doc ? escapeSql(r.doc) : 'NULL'}, '${r.status}', ${escapeSql(r.loc)}, ${escapeSql(r.rep)}, 0)${isLast ? ';' : ','}`;
            });
            
            sqlStatements.push(values.join('\n'));
            sqlStatements.push(''); 
        }

        const nombreArchivo = `lote_gigante_${loteIdx + 1}.sql`;
        fs.writeFileSync(nombreArchivo, sqlStatements.join('\n'), 'utf-8');
        console.log(`   💾 Generado con éxito: '${nombreArchivo}' (${loteRecords.length} registros).`);
    }

    console.log("\n=================================================================");
    console.log("🎉 ¡PROCESAMIENTO TERMINADO! El JSON ha sido convertido a SQL.");
    console.log("=================================================================");
}

procesarJSON();
