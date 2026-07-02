const fs = require('fs');

// 1. Detección de Archivo y Generación de Marca de Tiempo (Timestamp)
const ARCHIVO_ENTRADA = process.argv[2] || 'delta_interceptado_terremoto_7210.csv';
const LIMITE_POR_ARCHIVO = 1500; // Supabase Web UI soporta bien hasta 1500 a 2000 líneas

const ahora = new Date();
const timestamp = ahora.getFullYear() + '-' + 
                 String(ahora.getMonth() + 1).padStart(2, '0') + '-' + 
                 String(ahora.getDate()).padStart(2, '0') + '_' + 
                 String(ahora.getHours()).padStart(2, '0') + '-' + 
                 String(ahora.getMinutes()).padStart(2, '0');

const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';

function escapeSql(str) {
    if (!str) return 'NULL';
    return "'" + String(str).replace(/'/g, "''").trim() + "'";
}

function mapStatus(status) {
    const s = String(status).toLowerCase();
    if (s.includes('missing')) return 'buscado';
    if (s.includes('deceased') || s.includes('fallecido')) return 'fallecido';
    if (s.includes('found') || s.includes('a_salvo')) return 'a_salvo';
    if (s.includes('hospital') || s.includes('herido')) return 'herido';
    return 'buscado';
}

function parseReporter(reporterStr) {
    if (!reporterStr || reporterStr.trim() === '') return 'No especificado';
    try {
        let cleanStr = reporterStr.trim();
        if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) {
            cleanStr = cleanStr.substring(1, cleanStr.length - 1).replace(/""/g, '"');
        }
        const reporterObj = JSON.parse(cleanStr);
        let info = [];
        if (reporterObj.name) info.push(reporterObj.name);
        if (reporterObj.phone) info.push(`Tel: ${reporterObj.phone}`);
        return info.length > 0 ? info.join(' - ') : 'No especificado';
    } catch (e) {
        return reporterStr.replace(/"/g, '').trim() || 'No especificado';
    }
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

function procesarCSV() {
    console.log("=====================================================================");
    console.log(`🚀 PROCESANDO ARCHIVO (CON AUTODIVISOR): ${ARCHIVO_ENTRADA}`);
    console.log(`🕒 MARCA DE TIEMPO GENERADA: ${timestamp}`);
    console.log("=====================================================================\n");
    
    if (!fs.existsSync(ARCHIVO_ENTRADA)) {
        console.error(`❌ ERROR: No se encuentra el archivo '${ARCHIVO_ENTRADA}'.`);
        return;
    }

    const fileContent = fs.readFileSync(ARCHIVO_ENTRADA, 'utf-8');
    const rows = parseCSVFull(fileContent);
    if (rows.length < 2) return console.log("⚠️ No hay suficientes datos para procesar.");

    const headers = rows[0].map(h => h.replace(/"/g, '').trim());
    
    let agregados = 0;
    let descartados = 0;
    let fileCounter = 1;
    let currentStatements = [];

    const guardarLote = () => {
        const nombreArchivo = `inyeccion_delta_${timestamp}_parte${fileCounter}.sql`;
        let sqlFinal = [
            "-- =====================================================================",
            `-- SCRIPT DE INYECCIÓN DELTA - PARTE ${fileCounter}`,
            `-- Generado el: ${ahora.toLocaleString()}`,
            "-- =====================================================================\n"
        ];
        sqlFinal.push(...currentStatements);
        fs.writeFileSync(nombreArchivo, sqlFinal.join('\n'));
        console.log(`✅ Creado: '${nombreArchivo}' con ${currentStatements.length} registros.`);
        fileCounter++;
        currentStatements = [];
    };

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const getVal = (colName) => { const idx = headers.indexOf(colName); return idx >= 0 && idx < row.length ? row[idx] : ''; };

        const firstName = getVal('firstName') || getVal('nombre') || '';
        const lastName = getVal('lastName') || getVal('apellido') || '';
        let fullName = `${firstName} ${lastName}`.trim().replace(/"/g, '');
        if (!fullName && getVal('name')) fullName = getVal('name').replace(/"/g, '');

        if (!fullName || fullName.includes('{') || fullName.includes('[') || fullName.includes('phone') || fullName.length > 60 || fullName.length < 3) {
            descartados++;
            continue;
        }

        const documentId = getVal('idNumber') || getVal('cedula');
        const status = mapStatus(getVal('status') || getVal('estado_reportado'));
        let location = getVal('lastSeen') || getVal('location') || getVal('description') || 'No especificada';
        location = location.replace(/(\r\n|\n|\r)/gm, " - ").replace(/"/g, '');
        const reporterInfo = parseReporter(getVal('reporter') || getVal('contacto'));

        const sql = `INSERT INTO persons (incident_id, name_desc, document_id, status, location_text, reporter_contact, trust_level) VALUES ('${INCIDENT_ID}', ${escapeSql(fullName)}, ${documentId ? escapeSql(documentId) : 'NULL'}, '${status}', ${escapeSql(location)}, ${escapeSql(reporterInfo)}, 0);`;
        
        currentStatements.push(sql);
        agregados++;

        // Si llegamos al límite, o es la última fila, guardamos el archivo
        if (currentStatements.length >= LIMITE_POR_ARCHIVO || i === rows.length - 1) {
            if (currentStatements.length > 0) guardarLote();
        }
    }
    
    console.log(`\n📈 Estadísticas: ${agregados} registros válidos | ${descartados} descartados.`);
    console.log(`👉 Ejecuta los archivos "parte1", "parte2", etc., en Supabase uno por uno.`);
}

procesarCSV();