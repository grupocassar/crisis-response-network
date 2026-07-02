const fs = require('fs');

const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';
const archivos = fs.readdirSync(__dirname);
const archivoCSV = archivos.find(f => f.startsWith('ninos_delta_rescate_') && f.endsWith('.csv'));

function escapeSql(str) {
    if (!str) return 'NULL';
    return "'" + String(str).replace(/'/g, "''").trim() + "'";
}

function parseCSV(text) {
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
    console.log("👶 INICIANDO PROCESADOR DELTA DE NIÑOS (RESCATE PRIORITARIO)");
    console.log("=====================================================================\n");
    if (!archivoCSV) return console.error("❌ No se encontró el archivo CSV de Niños.");

    const contenido = fs.readFileSync(archivoCSV, 'utf-8');
    const filas = parseCSV(contenido);
    if (filas.length < 2) return console.log("⚠️ Archivo vacío.");

    const headers = filas[0].map(h => h.toLowerCase().replace(/"/g, ''));
    
    let sqlStatements = [
        "-- =====================================================================",
        "-- SCRIPT DE INYECCIÓN DELTA DE NIÑOS (PRIORIDAD MÁXIMA)",
        "-- =====================================================================\n"
    ];

    let procesados = 0;
    let huellasVistas = new Set();

    for (let i = 1; i < filas.length; i++) {
        const row = filas[i];
        const getVal = (cols) => { for(let n of cols) { let idx = headers.indexOf(n); if(idx>=0 && row[idx]) return row[idx].replace(/"/g, '').trim(); } return ''; };

        let nombre = getVal(['nombre', 'name', 'nombres', 'fullname']);
        let cedula = getVal(['cedula', 'id', 'uuid', 'document_id']);
        let statusOrig = getVal(['status', 'estado_reportado', 'estado']);
        let loc = getVal(['last_seen', 'location', 'ubicacion', 'detail']);
        let origen = getVal(['_etiqueta_rescate']);

        if (!nombre || nombre.length < 3) continue;

        let huella = `${nombre.toLowerCase()}|${cedula}`.trim();
        if (huellasVistas.has(huella)) continue;
        huellasVistas.add(huella);

        let estadoFinal = 'buscado';
        if (origen.includes('Localizados') || statusOrig.toLowerCase().match(/salvo|found/)) estadoFinal = 'a_salvo';
        
        if (!nombre.includes('(Menor de edad)')) nombre += ' (Menor de edad)';

        sqlStatements.push(`INSERT INTO persons (incident_id, name_desc, document_id, status, location_text, reporter_contact, trust_level) VALUES ('${INCIDENT_ID}', ${escapeSql(nombre)}, ${cedula.length >= 5 ? escapeSql(cedula) : 'NULL'}, '${estadoFinal}', ${escapeSql(loc || 'No especificada')}, 'Actualización Niños V5', 1);`);
        procesados++;
    }

    fs.writeFileSync('inyeccion_ninos_delta_rapido.sql', sqlStatements.join('\n'));
    console.log(`✅ ¡Proceso exitoso! Se generó el archivo SQL con ${procesados} menores de edad.`);
    console.log(`👉 Archivo generado: 'inyeccion_ninos_delta_rapido.sql'`);
}

iniciar();
