const fs = require('fs');
const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';

const archivos = fs.readdirSync(__dirname);
// Buscar el archivo exacto que consiguió Claude
const archivoNinos = archivos.find(f => f.startsWith('ninos_1000') && f.endsWith('.csv'));

function escapeSql(str) { return !str ? 'NULL' : "'" + String(str).replace(/'/g, "''").trim() + "'"; }

function parseCSVFull(text) {
    const rows = []; let cur = []; let cell = ''; let quotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i], nC = text[i + 1];
        if (c === '\\' && nC === '"') { cell += '"'; i++; } 
        else if (c === '"' && nC === '"') { cell += '"'; i++; } 
        else if (c === '"') quotes = !quotes; 
        else if (c === ',' && !quotes) { cur.push(cell.trim()); cell = ''; } 
        else if ((c === '\n' || c === '\r') && !quotes) {
            if (c === '\r' && nC === '\n') i++; 
            cur.push(cell.trim()); if (cur.some(x => x !== '')) rows.push(cur);
            cur = []; cell = '';
        } else cell += c;
    }
    if (cell || cur.length > 0) { cur.push(cell.trim()); if (cur.some(x => x !== '')) rows.push(cur); }
    return rows;
}

if (!archivoNinos) return console.log("❌ Archivo de niños no encontrado en la carpeta.");
console.log(`👶 Procesando los 1000 niños desde: ${archivoNinos}`);

const filas = parseCSVFull(fs.readFileSync(archivoNinos, 'utf-8'));
const headers = filas[0].map(h => h.replace(/"/g, '').trim().toLowerCase());

let statements = [
    "-- =====================================================================",
    "-- INYECCIÓN DE 1.000 NIÑOS ENCONTRADOS (RED AYUDA)",
    "-- =====================================================================\n"
];
let procesados = 0;

for (let i = 1; i < filas.length; i++) {
    const row = filas[i];
    const getVal = (col) => { const idx = headers.indexOf(col); return idx >= 0 && row[idx] ? row[idx].replace(/"/g, '').trim() : ''; };
    
    // Nombres de columnas basados en el reporte de Claude
    let nombre = getVal('title') || getVal('nombre') || '';
    if (!nombre || nombre.length < 3) continue;
    
    // Etiquetamos a todos como menores de edad
    if (!nombre.includes('(Menor de edad)')) nombre += ' (Menor de edad)';
    
    let codigo = getVal('codigo') || getVal('id') || '';
    let estado_custodia = getVal('estado_custodia') || 'bajo_resguardo';
    let loc = `Bajo custodia oficial: ${estado_custodia}`;
    
    statements.push(`INSERT INTO persons (incident_id, name_desc, document_id, status, location_text, reporter_contact, trust_level) VALUES ('${INCIDENT_ID}', ${escapeSql(nombre)}, ${escapeSql(codigo)}, 'a_salvo', ${escapeSql(loc)}, 'API Niños Red Ayuda', 1);`);
    procesados++;
}

fs.writeFileSync('inyeccion_1000_ninos.sql', statements.join('\n'));
console.log(`✅ ¡Éxito! ${procesados} niños convertidos a SQL. Ejecuta 'inyeccion_1000_ninos.sql' en tu Supabase.`);
