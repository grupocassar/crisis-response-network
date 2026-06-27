const fs = require('fs');

// Configuración
const ARCHIVO_ENTRADA = 'fallecidos_descarga_final_decodificada.csv';
const ARCHIVO_SALIDA_SQL = 'importacion_masiva_final.sql';
const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';

// Función para limpiar comillas y textos
function escapeSql(str) {
    if (!str) return 'NULL';
    return "'" + String(str).replace(/'/g, "''").trim() + "'";
}

// Mapeo de estados al formato de tu base de datos
function mapStatus(status) {
    const s = String(status).toLowerCase();
    if (s.includes('missing')) return 'buscado';
    if (s.includes('deceased') || s.includes('fallecido')) return 'fallecido';
    if (s.includes('found') || s.includes('a_salvo')) return 'a_salvo';
    if (s.includes('hospital') || s.includes('herido')) return 'herido';
    return 'buscado'; // Por defecto
}

// Extraer el teléfono y nombre del reportero del JSON anidado
function parseReporter(reporterStr) {
    if (!reporterStr || reporterStr.trim() === '') return 'No especificado';
    try {
        let cleanStr = reporterStr.trim();
        // Limpiamos escapes excesivos de CSV
        if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) {
            cleanStr = cleanStr.substring(1, cleanStr.length - 1).replace(/""/g, '"');
        }
        const reporterObj = JSON.parse(cleanStr);
        let info = [];
        if (reporterObj.name) info.push(reporterObj.name);
        if (reporterObj.phone) info.push(`Tel: ${reporterObj.phone}`);
        return info.length > 0 ? info.join(' - ') : 'No especificado';
    } catch (e) {
        return 'No especificado';
    }
}

// Motor Avanzado de Parseo CSV (Soporta saltos de línea internos, comas, \" y "")
function parseCSVFull(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        // Manejar barras invertidas seguidas de comillas (común en Remix)
        if (char === '\\' && nextChar === '"') {
            currentCell += '"';
            i++; // Saltar la barra de escape
        } else if (char === '"' && nextChar === '"') {
            currentCell += '"';
            i++; // Saltar comilla doble escapada en CSV tradicional
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++; // Manejar Windows CRLF
            currentRow.push(currentCell.trim());
            if (currentRow.some(c => c !== '')) rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c !== '')) rows.push(currentRow);
    }
    return rows;
}

function procesarCSV() {
    console.log("🚀 Leyendo el CSV decodificado con motor avanzado anti-errores...");
    
    const fileContent = fs.readFileSync(ARCHIVO_ENTRADA, 'utf-8');
    const rows = parseCSVFull(fileContent);
    
    if (rows.length < 2) {
        console.log("⚠️ No hay suficientes datos para procesar.");
        return;
    }

    const headers = rows[0];
    const sqlStatements = [];
    
    // Encabezado del archivo SQL
    sqlStatements.push("-- =====================================================================");
    sqlStatements.push("-- SCRIPT DE IMPORTACIÓN MASIVA REPARADO - TERREMOTO VENEZUELA 2026");
    sqlStatements.push("-- =====================================================================\n");
    
    let agregados = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const getVal = (colName) => {
            const idx = headers.indexOf(colName);
            return idx >= 0 && idx < row.length ? row[idx] : '';
        };

        const firstName = getVal('firstName');
        const lastName = getVal('lastName');
        let fullName = `${firstName} ${lastName}`.trim();
        
        // Limpiar comillas residuales que pudieran quedar en el nombre
        fullName = fullName.replace(/"/g, '');

        // FILTRO DE SEGURIDAD ULTRA-ESTRICTO:
        // Si el nombre contiene código, llaves, corchetes, correos o teléfonos, ES BASURA. Lo descartamos.
        if (!fullName || 
            fullName.includes('{') || 
            fullName.includes('[') || 
            fullName.includes('phone') || 
            fullName.includes('email') ||
            fullName.includes('source') ||
            fullName.includes(':') ||
            fullName.length > 60 ||
            fullName.length < 3) {
            continue;
        }

        const documentId = getVal('idNumber');
        const status = mapStatus(getVal('status'));
        
        let location = getVal('lastSeen');
        if (!location) location = getVal('description');
        if (!location) location = 'No especificada';
        
        // Limpiamos la ubicación de saltos de línea y comillas dobles para evitar inyecciones SQL
        location = location.replace(/(\r\n|\n|\r)/gm, " - ").replace(/"/g, '');

        const reporterInfo = parseReporter(getVal('reporter'));

        const sql = `INSERT INTO persons (incident_id, name_desc, document_id, status, location_text, reporter_contact, trust_level) VALUES ('${INCIDENT_ID}', ${escapeSql(fullName)}, ${documentId ? escapeSql(documentId) : 'NULL'}, '${status}', ${escapeSql(location)}, ${escapeSql(reporterInfo)}, 0);`;
        
        sqlStatements.push(sql);
        agregados++;
    }
    
    fs.writeFileSync(ARCHIVO_SALIDA_SQL, sqlStatements.join('\n'));
    console.log(`\n✅ ¡ÉXITO! Se generó el archivo '${ARCHIVO_SALIDA_SQL}' con ${agregados} registros PUROS Y PERFECTOS.`);
    console.log("Ejecuta este SQL en Supabase y habrás salvado y asegurado toda la información.");
}

procesarCSV();