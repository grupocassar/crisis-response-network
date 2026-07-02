const fs = require('fs');

const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';

// 1. Buscar automáticamente el archivo del Delta Rojo
const archivosEnCarpeta = fs.readdirSync(__dirname);
const archivoObjetivo = archivosEnCarpeta.find(f => f.startsWith('delta_rojo_nuevos_') && f.endsWith('.csv'));

function escapeSql(str) {
    if (!str) return 'NULL';
    return "'" + String(str).replace(/'/g, "''").trim() + "'";
}

function parseCSVFull(text) {
    const rows = []; let currentRow = []; let currentCell = ''; let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i]; const nextChar = text[i + 1];
        if (char === '\\' && nextChar === '"') { currentCell += '"'; i++; } 
        else if (char === '"' && nextChar === '"') { currentCell += '"'; i++; } 
        else if (char === '"') { inQuotes = !inQuotes; } 
        else if (char === ',' && !inQuotes) { currentRow.push(currentCell.trim()); currentCell = ''; } 
        else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++; 
            currentRow.push(currentCell.trim()); if (currentRow.some(c => c !== '')) rows.push(currentRow);
            currentRow = []; currentCell = '';
        } else { currentCell += char; }
    }
    if (currentCell || currentRow.length > 0) { currentRow.push(currentCell.trim()); if (currentRow.some(c => c !== '')) rows.push(currentRow); }
    return rows;
}

function iniciar() {
    console.log("=====================================================================");
    console.log("🔴 INICIANDO PROCESADOR DELTA ROJO (NUEVOS DESAPARECIDOS 80K)");
    console.log("=====================================================================\n");

    if (!archivoObjetivo) {
        return console.error("❌ ERROR: No se encontró ningún archivo 'delta_rojo_nuevos_...'");
    }

    console.log(`📁 Archivo detectado: ${archivoObjetivo}`);

    const contenido = fs.readFileSync(archivoObjetivo, 'utf-8');
    const filas = parseCSVFull(contenido);
    if (filas.length < 2) return console.log("⚠️ El archivo está vacío.");

    const headers = filas[0].map(h => h.replace(/"/g, '').trim().toLowerCase());
    
    let insertValues = [];
    let fileCounter = 1;
    let procesados = 0;
    let descartados = 0;
    let huellasVistas = new Set();

    const LIMITE_LOTE = 1000; // Pedazos de 1000 para que Supabase los asimile en un parpadeo

    const guardarLote = (valores) => {
        let sqlStatements = [
            `-- =====================================================================`,
            `-- LOTE ${fileCounter}: INYECCIÓN DELTA ROJO (NUEVOS BUSCADOS)`,
            `-- =====================================================================`,
            `INSERT INTO persons (incident_id, name_desc, document_id, status, location_text, reporter_contact, trust_level) VALUES`
        ];

        sqlStatements.push(valores.join(',\n') + ';');

        const nombreArchivo = `inyeccion_delta_rojo_parte_${fileCounter}.sql`;
        fs.writeFileSync(nombreArchivo, sqlStatements.join('\n'));
        console.log(`✅ Archivo '${nombreArchivo}' generado con éxito (${valores.length} registros).`);
        fileCounter++;
    };

    for (let i = 1; i < filas.length; i++) {
        const row = filas[i];
        const getVal = (cols) => { 
            for(let n of cols) { 
                let idx = headers.indexOf(n); 
                if(idx >= 0 && row[idx]) return row[idx].replace(/"/g, '').trim(); 
            } 
            return ''; 
        };

        let nombre = getVal(['nombre', 'name', 'nombres', 'persona', 'fullname']);
        let cedula = getVal(['cedula', 'id', 'uuid', 'document_id', 'idnumber']);
        let loc = getVal(['last_seen', 'location', 'ubicacion', 'detail', 'hospital_centro']) || 'No especificada';

        if (!nombre || nombre.length < 3 || nombre.includes('{') || nombre.includes('[')) {
            descartados++;
            continue;
        }

        // Deduplicación en RAM para el propio archivo
        let huella = `${nombre.toLowerCase()}|${cedula}`.trim();
        if (huellasVistas.has(huella)) {
            descartados++;
            continue;
        }
        huellasVistas.add(huella);

        // Formatear cédula
        let cedulaSQL = 'NULL';
        if (cedula && cedula.length > 4) {
            let cl = cedula.replace(/[^0-9]/g, '');
            if (cl) cedulaSQL = escapeSql(cl);
        }

        // Siempre entra como BUSCADO
        let estadoFinal = 'buscado';

        insertValues.push(`('${INCIDENT_ID}', ${escapeSql(nombre)}, ${cedulaSQL}, '${estadoFinal}', ${escapeSql(loc)}, 'Cacería Delta Rojo 80k', 1)`);
        procesados++;

        if (insertValues.length >= LIMITE_LOTE) {
            guardarLote(insertValues);
            insertValues = [];
        }
    }

    if (insertValues.length > 0) guardarLote(insertValues);
    console.log(`\n🚀 ¡Listo! Se prepararon ${procesados} personas nuevas en ${fileCounter - 1} archivos SQL.`);
    console.log(`🗑️ Descartados (Basura/Clones en el CSV): ${descartados}`);
    console.log(`👉 Ejecuta los archivos 'inyeccion_delta_rojo_parte_X.sql' en Supabase uno por uno.`);
}

iniciar();
