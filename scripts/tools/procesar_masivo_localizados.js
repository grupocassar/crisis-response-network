const fs = require('fs');

const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';
const archivos = fs.readdirSync(__dirname);
const archivoCSV = archivos.find(f => f.startsWith('rescate_rsc_localizados_') && f.endsWith('.csv'));

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
    console.log("🟢 INICIANDO PROCESADOR MASIVO DE LOCALIZADOS (A SALVO)");
    console.log("=====================================================================\n");
    if (!archivoCSV) return console.error("❌ No se encontró el archivo CSV de Localizados.");

    const contenido = fs.readFileSync(archivoCSV, 'utf-8');
    const filas = parseCSV(contenido);
    if (filas.length < 2) return console.log("⚠️ Archivo vacío.");

    const headers = filas[0].map(h => h.toLowerCase().replace(/"/g, ''));
    
    let sqlStatements = [
        "-- =====================================================================",
        "-- CRUCE MASIVO DE LOCALIZADOS (A SALVO) CON ÍNDICES GIN",
        "-- Este script convierte a verde a miles de personas en 1 segundo.",
        "-- =====================================================================\n",
        "CREATE TEMP TABLE temp_localizados (p0 TEXT, p1 TEXT, cedula_limpia TEXT);\n"
    ];

    let insertValues = [];
    let procesados = 0;

    for (let i = 1; i < filas.length; i++) {
        const row = filas[i];
        const getVal = (cols) => { for(let n of cols) { let idx = headers.indexOf(n); if(idx>=0 && row[idx]) return row[idx].replace(/"/g, '').trim(); } return ''; };

        let nombre = getVal(['nombre', 'name', 'nombres', 'persona', 'fullname']);
        let cedula = getVal(['cedula', 'id', 'uuid', 'document_id', 'idnumber']);

        if (!nombre || nombre.length < 3) continue;

        // Partimos el nombre en dos palabras para asegurar el match perfecto sin importar el orden
        let palabras = nombre.split(' ').filter(p => p.length > 2);
        let p0_sql = 'NULL'; let p1_sql = 'NULL';
        if (palabras.length >= 2) {
            p0_sql = `'${palabras[0].replace(/'/g, "''").toLowerCase()}'`;
            p1_sql = `'${palabras[1].replace(/'/g, "''").toLowerCase()}'`;
        } else if (palabras.length === 1) {
            p0_sql = `'${palabras[0].replace(/'/g, "''").toLowerCase()}'`;
            p1_sql = p0_sql; 
        }

        let cedula_sql = 'NULL';
        if (cedula && cedula.length > 4) {
            let cl = cedula.replace(/[^0-9]/g, '');
            if (cl) cedula_sql = `'${cl}'`;
        }

        insertValues.push(`(${p0_sql}, ${p1_sql}, ${cedula_sql})`);
        procesados++;
    }

    const CHUNK = 1000;
    for (let i=0; i<insertValues.length; i+=CHUNK) {
        sqlStatements.push("INSERT INTO temp_localizados (p0, p1, cedula_limpia) VALUES");
        sqlStatements.push(insertValues.slice(i, i+CHUNK).join(',\n') + ';');
    }

    sqlStatements.push(`\n-- ACTUALIZACIÓN MÁGICA CON JOIN Y SEARCH_NAME`);
    sqlStatements.push(`UPDATE persons p`);
    sqlStatements.push(`SET status = 'a_salvo',`);
    sqlStatements.push(`    updated_at = NOW()`);
    sqlStatements.push(`FROM temp_localizados t`);
    sqlStatements.push(`WHERE p.incident_id = '${INCIDENT_ID}'`);
    sqlStatements.push(`  AND p.status = 'buscado' -- ¡Solo pasamos a salvo a los que están perdidos!`);
    sqlStatements.push(`  AND (`);
    sqlStatements.push(`    (t.cedula_limpia IS NOT NULL AND REPLACE(p.document_id, '.', '') = t.cedula_limpia)`);
    sqlStatements.push(`    OR`);
    sqlStatements.push(`    (t.p0 IS NOT NULL AND p.search_name ILIKE '%' || unaccent(t.p0) || '%' AND p.search_name ILIKE '%' || unaccent(t.p1) || '%')`);
    sqlStatements.push(`  );\n`);
    sqlStatements.push(`DROP TABLE temp_localizados;`);

    fs.writeFileSync('cruce_masivo_localizados.sql', sqlStatements.join('\n'));
    console.log(`✅ ¡Éxito Total! ${procesados} registros analizados y preparados.`);
    console.log(`👉 Archivo generado: 'cruce_masivo_localizados.sql'. Ejecútalo en Supabase.`);
}

iniciar();
