const fs = require('fs');

const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';

// Busca automáticamente el archivo que acabas de descargar
const archivosEnCarpeta = fs.readdirSync(__dirname);
const archivoObjetivo = archivosEnCarpeta.find(f => f.startsWith('rescate_ninos_y_localizados_Puro_') && f.endsWith('.csv'));

function escapeSql(str) {
    if (!str) return 'NULL';
    return "'" + String(str).replace(/'/g, "''").trim() + "'";
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

function procesarMenores() {
    console.log("=====================================================================");
    console.log("👶 INICIANDO PROCESADOR PRIORITARIO DE MENORES Y LOCALIZADOS");
    console.log("=====================================================================\n");

    if (!archivoObjetivo) {
        console.error("❌ ERROR: No se encontró ningún archivo que empiece con 'rescate_ninos_y_localizados_Puro_'.");
        console.log("👉 Asegúrate de haber arrastrado el archivo a tu carpeta de VS Code.");
        return;
    }

    console.log(`📁 Procesando archivo: ${archivoObjetivo}`);

    const contenido = fs.readFileSync(archivoObjetivo, 'utf-8');
    const filas = parseCSVFull(contenido);
    if (filas.length < 2) return console.log("⚠️ El archivo está vacío.");

    const headers = filas[0].map(h => h.replace(/"/g, '').trim().toLowerCase());
    
    let sqlStatements = [
        "-- =====================================================================",
        "-- SCRIPT DE INYECCIÓN DE PRIORIDAD MÁXIMA (NIÑOS Y LOCALIZADOS)",
        "-- =====================================================================\n"
    ];

    let procesados = 0;
    let huellasVistas = new Set();

    for (let i = 1; i < filas.length; i++) {
        const row = filas[i];
        const getVal = (colNames) => { 
            for(let name of colNames) {
                const idx = headers.findIndex(h => h === name);
                if(idx >= 0 && idx < row.length && row[idx]) return row[idx].replace(/"/g, '').trim();
            }
            return ''; 
        };

        let nombre = getVal(['name', 'nombre', 'nombres', 'fullname']);
        let cedula = getVal(['id', 'uuid', 'cedula', 'document_id']);
        let statusOrig = getVal(['status', 'estado_reportado', 'estado']);
        let loc = getVal(['last_seen', 'location', 'ubicacion', 'detail', 'hospital_centro']);
        let origen = getVal(['_etiqueta_rescate']);

        if (!nombre || nombre.length < 3) continue;

        // Limpieza y Deduplicación
        let huella = `${nombre.toLowerCase()}|${cedula}`.trim();
        if (huellasVistas.has(huella)) continue;
        huellasVistas.add(huella);

        // Lógica de Estados y Etiquetas
        let estadoFinal = 'buscado';
        
        // Si viene del endpoint de Localizados, lo ponemos en verde
        if (origen.includes('Localizados') || statusOrig.toLowerCase().includes('salvo') || statusOrig.toLowerCase().includes('found')) {
            estadoFinal = 'a_salvo';
        }
        
        // Si viene del endpoint de Niños, le ponemos la etiqueta
        if (origen.includes('Niños') && !nombre.includes('(Menor de edad)')) {
            nombre += ' (Menor de edad)';
        }

        const sql = `INSERT INTO persons (incident_id, name_desc, document_id, status, location_text, reporter_contact, trust_level) VALUES ('${INCIDENT_ID}', ${escapeSql(nombre)}, ${cedula.length >= 5 ? escapeSql(cedula) : 'NULL'}, '${estadoFinal}', ${escapeSql(loc || 'No especificada')}, 'Rescate Prioritario API V4', 1);`;
        
        sqlStatements.push(sql);
        procesados++;
    }

    const archivoSalida = 'inyeccion_ninos_prioridad.sql';
    fs.writeFileSync(archivoSalida, sqlStatements.join('\n'));

    console.log(`\n✅ ¡Proceso Exitoso!`);
    console.log(`👶 Registros blindados y listos para inyección: ${procesados}`);
    console.log(`🚀 Ejecuta el archivo '${archivoSalida}' en el SQL Editor de Supabase.`);
}

procesarMenores();