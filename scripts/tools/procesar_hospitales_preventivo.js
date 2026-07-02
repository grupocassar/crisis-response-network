const fs = require('fs');

const ARCHIVO_CSV = 'pacientes_hospitalizados_crudos.csv';
const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';

function escapeSql(str) {
    if (!str) return 'NULL';
    return "'" + String(str).replace(/'/g, "''").trim() + "'";
}

function parseCSV(text) {
    const rows = []; let currentRow = []; let currentCell = ''; let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i]; const nextChar = text[i + 1];
        if (char === '"' && nextChar === '"' && inQuotes) { currentCell += '"'; i++; } 
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
    console.log("🏥 PREPARANDO INYECCIÓN PREVENTIVA MASIVA DE HOSPITALES");
    console.log("=====================================================================\n");

    if (!fs.existsSync(ARCHIVO_CSV)) return console.error(`❌ No se encontró el archivo ${ARCHIVO_CSV}`);

    const contenido = fs.readFileSync(ARCHIVO_CSV, 'utf-8');
    const filas = parseCSV(contenido);
    if (filas.length < 2) return console.log("⚠️ El archivo CSV está vacío.");

    const headers = filas[0].map(h => h.toLowerCase().replace(/"/g, ''));
    
    const idxNombre = headers.findIndex(h => h.includes('nombre') || h.includes('name') || h.includes('first'));
    const idxApellido = headers.findIndex(h => h.includes('apellido') || h.includes('last'));
    const idxCedula = headers.findIndex(h => h.includes('cedula') || h.includes('doc') || h.includes('ci'));
    const idxHospital = headers.findIndex(h => h.includes('hospital') || h.includes('centro') || h.includes('location'));

    let insertValues = [];
    let fileCounter = 1;
    let procesados = 0;
    const LIMITE_LOTE = 2000;

    const guardarLote = (valores) => {
        let sqlStatements = [
            `-- LOTE ${fileCounter}: REGISTRO PREVENTIVO DE HOSPITALES`,
            `INSERT INTO persons (incident_id, name_desc, document_id, status, location_text, reporter_contact, trust_level) VALUES`
        ];
        sqlStatements.push(valores.join(',\n') + ';');
        const nombreArchivo = `inyeccion_preventiva_hospitales_parte_${fileCounter}.sql`;
        fs.writeFileSync(nombreArchivo, sqlStatements.join('\n'));
        console.log(`✅ Creado '${nombreArchivo}' con ${valores.length} pacientes.`);
        fileCounter++;
    };

    for (let i = 1; i < filas.length; i++) {
        const row = filas[i];
        let nombre = idxNombre >= 0 && row[idxNombre] ? row[idxNombre].replace(/"/g, '').trim() : '';
        let apellido = idxApellido >= 0 && row[idxApellido] ? row[idxApellido].replace(/"/g, '').trim() : '';
        let cedula = idxCedula >= 0 && row[idxCedula] ? row[idxCedula].replace(/"/g, '').trim() : '';
        let hospital = idxHospital >= 0 && row[idxHospital] ? row[idxHospital].replace(/"/g, '').trim() : 'Hospitalizado (Red Pública)';

        let nombreCompleto = `${nombre} ${apellido}`.trim();
        if (!nombreCompleto || nombreCompleto.length < 3) continue;

        let cedulaSQL = 'NULL';
        if (cedula && cedula.length > 4) {
            let cl = cedula.replace(/[^0-9]/g, '');
            if (cl) cedulaSQL = escapeSql(cl);
        }

        let locSQL = escapeSql(`INGRESADO: ${hospital}`);

        insertValues.push(`('${INCIDENT_ID}', ${escapeSql(nombreCompleto)}, ${cedulaSQL}, 'herido', ${locSQL}, 'Registro Preventivo (Hospitales)', 1)`);
        procesados++;

        if (insertValues.length >= LIMITE_LOTE) {
            guardarLote(insertValues);
            insertValues = [];
        }
    }

    if (insertValues.length > 0) guardarLote(insertValues);
    console.log(`\n🚀 ¡Listo! ${procesados} pacientes preparados en SQL.`);
}

iniciar();
