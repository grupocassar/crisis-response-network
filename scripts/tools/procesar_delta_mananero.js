const fs = require('fs');

const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';
const archivos = fs.readdirSync(__dirname);

// Buscar el archivo del delta mañanero
const archivoCSV = archivos.find(f => f.startsWith('delta_mananero_localizados_') && f.endsWith('.csv'));

if (!archivoCSV) {
    console.error("❌ No se encontró el archivo CSV (delta_mananero_localizados_...).");
    process.exit(1);
}

// Limpiador ultra-veloz de acentos en JavaScript
function normalizarTextoJS(str) {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
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
    console.log(`🟢 PROCESANDO DELTA MAÑANERO DE RESCATES: ${archivoCSV} 🟢`);
    console.log("=====================================================================\n");

    const contenido = fs.readFileSync(archivoCSV, 'utf-8');
    const filas = parseCSV(contenido);
    const headers = filas[0].map(h => h.toLowerCase().replace(/"/g, ''));
    
    let insertValues = [];
    let procesados = 0;

    const guardarLote = (valores) => {
        let sqlStatements = [
            `-- =====================================================================`,
            `-- ACTUALIZACIÓN DELTA MAÑANERO (A SALVO)`,
            `-- =====================================================================`,
            `CREATE TEMP TABLE temp_loc_mananero (p0 TEXT, p1 TEXT, cedula_limpia TEXT);\n`
        ];

        // Insertar en la tabla temporal en bloques de 500
        for (let i = 0; i < valores.length; i += 500) {
            sqlStatements.push("INSERT INTO temp_loc_mananero (p0, p1, cedula_limpia) VALUES");
            sqlStatements.push(valores.slice(i, i + 500).join(',\n') + ';');
        }

        sqlStatements.push(`\n-- 1. FUSIÓN INSTANTÁNEA POR CÉDULA`);
        sqlStatements.push(`UPDATE persons p`);
        sqlStatements.push(`SET status = 'a_salvo', updated_at = NOW()`);
        sqlStatements.push(`FROM temp_loc_mananero t`);
        sqlStatements.push(`WHERE p.incident_id = '${INCIDENT_ID}'`);
        sqlStatements.push(`  AND p.status = 'buscado'`);
        sqlStatements.push(`  AND t.cedula_limpia IS NOT NULL`);
        sqlStatements.push(`  AND REPLACE(p.document_id, '.', '') = t.cedula_limpia;\n`);

        sqlStatements.push(`-- 2. FUSIÓN VELOZ POR NOMBRE Y APELLIDO`);
        sqlStatements.push(`UPDATE persons p`);
        sqlStatements.push(`SET status = 'a_salvo', updated_at = NOW()`);
        sqlStatements.push(`FROM temp_loc_mananero t`);
        sqlStatements.push(`WHERE p.incident_id = '${INCIDENT_ID}'`);
        sqlStatements.push(`  AND p.status = 'buscado'`);
        sqlStatements.push(`  AND t.p0 IS NOT NULL AND t.p1 IS NOT NULL`);
        sqlStatements.push(`  AND p.search_name LIKE '%' || t.p0 || '%'`);
        sqlStatements.push(`  AND p.search_name LIKE '%' || t.p1 || '%';\n`);
        
        sqlStatements.push(`DROP TABLE temp_loc_mananero;`);

        const fileName = `cruce_mananero_localizados.sql`;
        fs.writeFileSync(fileName, sqlStatements.join('\n'));
        console.log(`✅ Archivo '${fileName}' generado con éxito (${valores.length} registros).`);
    };

    for (let i = 1; i < filas.length; i++) {
        const row = filas[i];
        const getVal = (cols) => { for(let n of cols) { let idx = headers.indexOf(n); if(idx>=0 && row[idx]) return row[idx].replace(/"/g, '').trim(); } return ''; };

        let nombre = getVal(['nombre', 'name', 'nombres', 'persona', 'fullname']);
        let cedula = getVal(['cedula', 'id', 'uuid', 'document_id', 'idnumber']);

        if (!nombre || nombre.length < 3) continue;

        let nombreNormalizado = normalizarTextoJS(nombre);
        let palabras = nombreNormalizado.split(' ').filter(p => p.length > 2);
        
        let p0_sql = 'NULL'; let p1_sql = 'NULL';
        if (palabras.length >= 2) {
            p0_sql = `'${palabras[0].replace(/'/g, "''")}'`;
            p1_sql = `'${palabras[1].replace(/'/g, "''")}'`;
        } else if (palabras.length === 1) {
            p0_sql = `'${palabras[0].replace(/'/g, "''")}'`;
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

    if (insertValues.length > 0) guardarLote(insertValues);
    console.log(`\n🚀 ¡Listo! Se prepararon ${procesados} personas rescatadas.`);
    console.log(`👉 Ejecuta el archivo 'cruce_mananero_localizados.sql' en tu Supabase.`);
}

iniciar();
