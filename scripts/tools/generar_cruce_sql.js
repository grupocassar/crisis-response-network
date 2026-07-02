const fs = require('fs');

const ARCHIVO_CSV = 'pacientes_hospitalizados_crudos.csv';
const ARCHIVO_SQL = 'cruce_hospitales_masivo.sql';
const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';

// Motor de parseo CSV
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        if (char === '"' && nextChar === '"' && inQuotes) {
            currentCell += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
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

function generarSQL() {
    console.log("🚀 Iniciando optimización de cruce masivo con índices GIN Trigram...");
    
    if (!fs.existsSync(ARCHIVO_CSV)) {
        console.error(`❌ No se encontró el archivo ${ARCHIVO_CSV}`);
        return;
    }

    const contenido = fs.readFileSync(ARCHIVO_CSV, 'utf-8');
    const filas = parseCSV(contenido);
    
    if (filas.length < 2) {
        console.log("⚠️ El CSV está vacío.");
        return;
    }

    const headers = filas[0].map(h => h.toLowerCase().replace(/"/g, ''));
    
    // Identificar dinámicamente las columnas de la API
    const idxNombre = headers.findIndex(h => h.includes('nombre') || h.includes('name') || h.includes('first'));
    const idxApellido = headers.findIndex(h => h.includes('apellido') || h.includes('last'));
    const idxCedula = headers.findIndex(h => h.includes('cedula') || h.includes('doc') || h.includes('ci'));
    const idxHospital = headers.findIndex(h => h.includes('hospital') || h.includes('centro') || h.includes('location'));

    let sqlStatements = [
        `-- =====================================================================`,
        `-- CRUCE MASIVO ULTRA-OPTIMIZADO CON ÍNDICES GIN (EVITA TIMEOUTS)`,
        `-- ID del Incidente: '${INCIDENT_ID}'`,
        `-- Registros procesados: ${filas.length - 1}`,
        `-- =====================================================================\n`,
        `-- 1. Habilitar extensión de consulta de texto pg_trgm`,
        `CREATE EXTENSION IF NOT EXISTS pg_trgm;\n`,
        `-- 2. Crear índice GIN en persons para que la búsqueda ILIKE sea instantánea`,
        `CREATE INDEX IF NOT EXISTS idx_persons_name_desc_trgm ON persons USING gin (name_desc gin_trgm_ops);\n`,
        `-- 3. Crear tabla temporal rápida`,
        `CREATE TEMP TABLE temp_cruce_hospitales (`,
        `    p0 VARCHAR,`,
        `    p1 VARCHAR,`,
        `    cedula_limpia VARCHAR,`,
        `    hospital VARCHAR`,
        `);\n`,
        `-- 4. Insertar registros en lotes compactos`
    ];

    let insertValues = [];
    let totalValidos = 0;

    for (let i = 1; i < filas.length; i++) {
        const row = filas[i];
        
        let nombre = idxNombre >= 0 && row[idxNombre] ? row[idxNombre].replace(/"/g, '').trim() : '';
        let apellido = idxApellido >= 0 && row[idxApellido] ? row[idxApellido].replace(/"/g, '').trim() : '';
        let cedula = idxCedula >= 0 && row[idxCedula] ? row[idxCedula].replace(/"/g, '').trim() : '';
        let hospital = idxHospital >= 0 && row[idxHospital] ? row[idxHospital].replace(/"/g, '').trim() : 'Hospitalizado (Red Pública)';
        
        let palabras = [];
        if (nombre && !apellido) {
            palabras = nombre.split(' ').filter(p => p.length > 2);
        } else {
            if (nombre) palabras.push(nombre.split(' ')[0]);
            if (apellido) palabras.push(apellido.split(' ')[0]);
        }

        let p0_sql = 'NULL';
        let p1_sql = 'NULL';
        if (palabras.length >= 2) {
            p0_sql = `'${palabras[0].replace(/'/g, "''")}'`;
            p1_sql = `'${palabras[1].replace(/'/g, "''")}'`;
        }

        let cedula_sql = 'NULL';
        if (cedula && cedula.length > 5) {
            let cedulaLimpia = cedula.replace(/[^0-9]/g, '');
            if (cedulaLimpia) {
                cedula_sql = `'${cedulaLimpia}'`;
            }
        }

        let hospital_sql = `'${hospital.replace(/'/g, "''")}'`;

        if (p0_sql !== 'NULL' || cedula_sql !== 'NULL') {
            insertValues.push(`(${p0_sql}, ${p1_sql}, ${cedula_sql}, ${hospital_sql})`);
            totalValidos++;
        }
    }

    // Dividir inserciones en grupos de 1000
    const CHUNK_SIZE = 1000;
    for (let idx = 0; idx < insertValues.length; idx += CHUNK_SIZE) {
        const chunk = insertValues.slice(idx, idx + CHUNK_SIZE);
        sqlStatements.push(`INSERT INTO temp_cruce_hospitales (p0, p1, cedula_limpia, hospital) VALUES`);
        sqlStatements.push(chunk.join(',\n') + ';');
        sqlStatements.push('');
    }

    // Actualizaciones divididas para máxima optimización
    sqlStatements.push(`-- 5. Cruce veloz de cédulas por coincidencia exacta`);
    sqlStatements.push(`UPDATE persons p`);
    sqlStatements.push(`SET status = 'herido',`);
    sqlStatements.push(`    location_text = 'INGRESADO: ' || t.hospital`);
    sqlStatements.push(`FROM temp_cruce_hospitales t`);
    sqlStatements.push(`WHERE p.incident_id = '${INCIDENT_ID}'`);
    sqlStatements.push(`  AND p.status = 'buscado'`);
    sqlStatements.push(`  AND t.cedula_limpia IS NOT NULL`);
    sqlStatements.push(`  AND REPLACE(p.document_id, '.', '') = t.cedula_limpia;\n`);

    sqlStatements.push(`-- 6. Cruce de nombres usando el nuevo índice GIN de Trigramas`);
    sqlStatements.push(`UPDATE persons p`);
    sqlStatements.push(`SET status = 'herido',`);
    sqlStatements.push(`    location_text = 'INGRESADO: ' || t.hospital`);
    sqlStatements.push(`FROM temp_cruce_hospitales t`);
    sqlStatements.push(`WHERE p.incident_id = '${INCIDENT_ID}'`);
    sqlStatements.push(`  AND p.status = 'buscado'`);
    sqlStatements.push(`  AND t.p0 IS NOT NULL AND t.p1 IS NOT NULL`);
    sqlStatements.push(`  AND p.name_desc ILIKE '%' || t.p0 || '%'`);
    sqlStatements.push(`  AND p.name_desc ILIKE '%' || t.p1 || '%';\n`);
    
    sqlStatements.push(`-- 7. Limpiar tabla temporal`);
    sqlStatements.push(`DROP TABLE temp_cruce_hospitales;`);

    fs.writeFileSync(ARCHIVO_SQL, sqlStatements.join('\n'), 'utf-8');
    console.log(`\n✅ Proceso completado. Se generó el script indexado '${ARCHIVO_SQL}' con ${totalValidos} registros.`);
}

generarSQL();