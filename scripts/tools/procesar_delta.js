const fs = require('fs');

const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';
const archivosEnCarpeta = fs.readdirSync(__dirname);
const archivoObjetivo = archivosEnCarpeta.find(f => f.startsWith('rescate_delta_fresco_') && f.endsWith('.csv'));

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

function procesarDelta() {
    console.log("=====================================================================");
    console.log("⚡ INICIANDO PROCESADOR DELTA BLINDADO");
    console.log("=====================================================================\n");
    if (!archivoObjetivo) return console.error("❌ ERROR: Archivo no encontrado.");

    const contenido = fs.readFileSync(archivoObjetivo, 'utf-8');
    const filas = parseCSVFull(contenido);
    
    let headerIndex = 0;
    for (let i = 0; i < Math.min(5, filas.length); i++) {
        if (filas[i].join(',').toLowerCase().match(/name|status|id|protegido/)) { headerIndex = i; break; }
    }

    const headers = filas[headerIndex].map(h => h.replace(/"/g, '').trim().toLowerCase());
    let sqlStatements = ["-- SCRIPT DE INYECCIÓN DELTA\n"];
    let procesados = 0; let huellasVistas = new Set();

    for (let i = headerIndex + 1; i < filas.length; i++) {
        const row = filas[i];
        const getVal = (cols) => { for(let n of cols) { let idx = headers.indexOf(n); if(idx>=0 && row[idx]) return row[idx].replace(/"/g, '').trim(); } return ''; };

        let nombre = getVal(['name', 'nombre', 'nombres', 'fullname']);
        let cedula = getVal(['id', 'uuid', 'cedula', 'document_id']);
        let statusOrig = getVal(['status', 'estado_reportado', 'estado']);
        let loc = getVal(['last_seen', 'location', 'ubicacion', 'detail']);
        let origen = getVal(['_etiqueta_rescate']);

        if (!nombre || nombre.length < 3) continue;
        let huella = `${nombre.toLowerCase()}|${cedula}`.trim();
        if (huellasVistas.has(huella)) continue;
        huellasVistas.add(huella);

        let estadoFinal = 'buscado';
        if (origen.includes('Localizados') || statusOrig.toLowerCase().match(/salvo|found/)) estadoFinal = 'a_salvo';
        if (origen.includes('Niños') && !nombre.includes('(Menor de edad)')) nombre += ' (Menor de edad)';

        sqlStatements.push(`INSERT INTO persons (incident_id, name_desc, document_id, status, location_text, reporter_contact, trust_level) VALUES ('${INCIDENT_ID}', ${escapeSql(nombre)}, ${cedula.length >= 5 ? escapeSql(cedula) : 'NULL'}, '${estadoFinal}', ${escapeSql(loc || 'No especificada')}, 'Actualización Delta V4', 1);`);
        procesados++;
    }

    fs.writeFileSync('inyeccion_delta_rapido.sql', sqlStatements.join('\n'));
    console.log(`✅ ¡Proceso exitoso! Registros válidos capturados: ${procesados}`);
}
procesarDelta();
