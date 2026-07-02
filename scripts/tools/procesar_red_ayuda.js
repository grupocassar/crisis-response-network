const fs = require('fs');
const path = require('path');

const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';
const FILAS_POR_ARCHIVO = 2000; // Lotes seguros para Supabase

// Buscar automáticamente todos los archivos descargados de esta operación
const archivosEnCarpeta = fs.readdirSync(__dirname);
const archivosExtraidos = archivosEnCarpeta.filter(f => 
    (f.startsWith('eve_') || f.startsWith('red_ayuda_')) && f.endsWith('.csv')
);

function escapeSql(str) {
    if (!str) return 'NULL';
    return "'" + String(str).replace(/'/g, "''").trim() + "'";
}

// Mapear los estados de su API a nuestra base de datos
function mapStatus(statusOriginal, esNino) {
    const s = String(statusOriginal).toLowerCase();
    let statusFinal = 'buscado';
    
    if (s.includes('hospital')) statusFinal = 'herido';
    else if (s.includes('salvo') || s.includes('located')) statusFinal = 'a_salvo';
    else if (s.includes('fallecido') || s.includes('deceased')) statusFinal = 'fallecido';
    else if (s.includes('missing')) statusFinal = 'buscado';
    
    return statusFinal;
}

function parseCSVFull(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        if (char === '\\' && nextChar === '"') { currentCell += '"'; i++; } 
        else if (char === '"' && nextChar === '"') { currentCell += '"'; i++; } 
        else if (char === '"') { inQuotes = !inQuotes; } 
        else if (char === ',' && !inQuotes) { currentRow.push(currentCell.trim()); currentCell = ''; } 
        else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++; 
            currentRow.push(currentCell.trim());
            if (currentRow.some(c => c !== '')) rows.push(currentRow);
            currentRow = []; currentCell = '';
        } else { currentCell += char; }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c !== '')) rows.push(currentRow);
    }
    return rows;
}

function licuarArchivos() {
    console.log("=====================================================================");
    console.log("🌪️ INICIANDO LICUADORA MAESTRA DE ARCHIVOS (RED AYUDA)");
    console.log("=====================================================================\n");

    if (archivosExtraidos.length === 0) {
        console.error("❌ No se encontraron archivos que empiecen por 'eve_' o 'red_ayuda_' en esta carpeta.");
        return;
    }

    console.log(`📁 Archivos detectados (${archivosExtraidos.length}):`);
    archivosExtraidos.forEach(f => console.log(`   - ${f}`));

    let todosLosRegistros = [];
    let huellasUnicas = new Set();
    let descartados = 0;

    // Procesar cada archivo y unificarlos en RAM
    for (const archivo of archivosExtraidos) {
        const contenido = fs.readFileSync(archivo, 'utf-8');
        const filas = parseCSVFull(contenido);
        if (filas.length < 2) continue;

        const headers = filas[0].map(h => h.replace(/"/g, '').trim().toLowerCase());
        
        for (let i = 1; i < filas.length; i++) {
            const row = filas[i];
            const getVal = (colName) => { 
                const idx = headers.findIndex(h => h === colName); 
                return idx >= 0 && idx < row.length ? row[idx] : ''; 
            };

            const nombre = getVal('name') || getVal('nombre') || '';
            const statusOrig = getVal('status') || '';
            const loc = getVal('last_seen') || getVal('location') || getVal('detail') || '';
            const isChild = getVal('is_child') === 'true' || getVal('is_child') === 'TRUE';
            const cedula = getVal('id') || getVal('cedula') || '';

            let nombreLimpio = nombre.replace(/"/g, '').trim();
            if (!nombreLimpio || nombreLimpio.length < 3) {
                descartados++;
                continue;
            }

            // Deduplicación hiper-precisa: Nombre + los primeros 30 caracteres de su ubicación
            let huella = `${nombreLimpio.toLowerCase()}|${loc.substring(0, 30).toLowerCase()}`;
            
            // Si ya lo procesamos, lo saltamos
            if (huellasUnicas.has(huella)) {
                descartados++;
                continue;
            }

            huellasUnicas.add(huella);

            // Añadir etiqueta de (Niño/a) si aplica
            if (isChild && !nombreLimpio.includes('(Menor de edad)')) {
                nombreLimpio += ' (Menor de edad)';
            }

            todosLosRegistros.push({
                nombre: nombreLimpio,
                cedula: cedula,
                estado: mapStatus(statusOrig, isChild),
                ubicacion: loc.replace(/(\r\n|\n|\r)/gm, " - ").replace(/"/g, '').trim() || 'No especificada'
            });
        }
    }

    console.log(`\n✅ Fusión Completada. Registros únicos reales: ${todosLosRegistros.length}`);
    console.log(`🗑️ Registros descartados (clones o inválidos dentro de los CSVs): ${descartados}`);

    // Generar lotes SQL
    let fileCounter = 1;
    let currentStatements = [];

    const guardarLote = () => {
        const nombreArchivo = `inyeccion_redayuda_parte${fileCounter}.sql`;
        let sqlFinal = [
            "-- =====================================================================",
            `-- SCRIPT DE INYECCIÓN UNIFICADA (RED AYUDA) - PARTE ${fileCounter}`,
            "-- =====================================================================\n"
        ];
        sqlFinal.push(...currentStatements);
        fs.writeFileSync(nombreArchivo, sqlFinal.join('\n'));
        console.log(`✅ Creado: '${nombreArchivo}' con ${currentStatements.length} registros.`);
        fileCounter++;
        currentStatements = [];
    };

    for (let i = 0; i < todosLosRegistros.length; i++) {
        const p = todosLosRegistros[i];
        const sql = `INSERT INTO persons (incident_id, name_desc, document_id, status, location_text, reporter_contact, trust_level) VALUES ('${INCIDENT_ID}', ${escapeSql(p.nombre)}, ${p.cedula.length > 4 ? escapeSql(p.cedula) : 'NULL'}, '${p.estado}', ${escapeSql(p.ubicacion)}, 'Extracción Red Ayuda', 0);`;
        
        currentStatements.push(sql);

        if (currentStatements.length >= FILAS_POR_ARCHIVO || i === todosLosRegistros.length - 1) {
            guardarLote();
        }
    }

    console.log("\n🚀 ¡LISTO! Ejecuta los archivos inyeccion_redayuda_parteX.sql generados en Supabase.");
}

licuarArchivos();