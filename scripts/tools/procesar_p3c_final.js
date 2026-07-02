const fs = require('fs');
const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';
const FILAS_LOTE = 2000;

const archivos = fs.readdirSync(__dirname);
const archivoP3C = archivos.find(f => f.startsWith('eve_parte3C_final_') && f.endsWith('.csv'));

if (!archivoP3C) return console.log("❌ No se encontró el archivo P3C.");
console.log(`\n🚀 Procesando lote final: ${archivoP3C}`);

function escapeSql(str) { return !str ? 'NULL' : "'" + String(str).replace(/'/g, "''").trim() + "'"; }

function parseCSVFull(text) {
    const rows = []; let cur = []; let cell = ''; let quotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i], nC = text[i + 1];
        if (c === '"' && nC === '"' && quotes) { cell += '"'; i++; } 
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

const filas = parseCSVFull(fs.readFileSync(archivoP3C, 'utf-8'));
const headers = filas[0].map(h => h.replace(/"/g, '').trim().toLowerCase());

let registros = [];
let huellas = new Set();

for (let i = 1; i < filas.length; i++) {
    const row = filas[i];
    const getVal = (col) => { const idx = headers.indexOf(col); return idx >= 0 && row[idx] ? row[idx].replace(/"/g, '').trim() : ''; };
    
    let nombre = getVal('name') || getVal('nombre') || '';
    let estado = getVal('status') || getVal('estado') || 'buscado';
    let loc = getVal('detail') || getVal('location') || 'No especificada';
    
    if (!nombre || nombre.length < 3) continue;
    
    let huella = `${nombre.toLowerCase()}|${loc.substring(0,30).toLowerCase()}`;
    if (!huellas.has(huella)) {
        huellas.add(huella);
        
        let statusSql = 'buscado';
        if (estado.toLowerCase().includes('located') || estado.toLowerCase().includes('salvo')) statusSql = 'a_salvo';
        else if (estado.toLowerCase().includes('hospital')) statusSql = 'herido';
        
        registros.push(`INSERT INTO persons (incident_id, name_desc, status, location_text, reporter_contact, trust_level) VALUES ('${INCIDENT_ID}', ${escapeSql(nombre)}, '${statusSql}', ${escapeSql(loc.substring(0, 100))}, 'Barrido API P3C', 0);`);
    }
}

let fileCount = 1;
for (let i = 0; i < registros.length; i += FILAS_LOTE) {
    const chunk = registros.slice(i, i + FILAS_LOTE);
    fs.writeFileSync(`inyeccion_adultos_p3c_parte${fileCount}.sql`, chunk.join('\n'));
    console.log(`✅ Archivo 'inyeccion_adultos_p3c_parte${fileCount}.sql' creado con ${chunk.length} registros.`);
    fileCount++;
}
console.log(`\n🔥 ¡Listo! Todos los datos convertidos a SQL.`);
