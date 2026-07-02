const fs = require('fs');

const ARCHIVO_ENTRADA = 'mis_buscados.csv';
const ARCHIVO_SALIDA_SQL = 'francotirador_exitos.sql';
const API_URL = "https://ozuxfepfkvnxkywdsqxy.supabase.co/rest/v1/rpc/buscar_paciente";

const HEADERS = {
    "accept": "*/*",
    "content-type": "application/json",
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dXhmZXBma3ZueGt5d2RzcXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjI5NTEsImV4cCI6MjA5Nzk5ODk1MX0.YhW0GalGkQZdO2NJTg_01C5XhdMmJ6RbNSNXXC0xG4o",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dXhmZXBma3ZueGt5d2RzcXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjI5NTEsImV4cCI6MjA5Nzk5ODk1MX0.YhW0GalGkQZdO2NJTg_01C5XhdMmJ6RbNSNXXC0xG4o"
};

function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        if (char === '"' && nextChar === '"' && inQuotes) { currentCell += '"'; i++; } 
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

function limpiarString(str) {
    if (!str) return '';
    return str.replace(/"/g, '').trim();
}

async function dispararFrancotirador() {
    console.log("=================================================================");
    console.log("🎯 INICIANDO OPERACIÓN FRANCOTIRADOR (CRUCE UNO-A-UNO)");
    console.log("=================================================================\n");

    if (!fs.existsSync(ARCHIVO_ENTRADA)) {
        console.error(`❌ ERROR: No se encuentra el archivo '${ARCHIVO_ENTRADA}'.`);
        process.exit(1);
    }

    const contenido = fs.readFileSync(ARCHIVO_ENTRADA, 'utf-8');
    const filas = parseCSV(contenido);
    const headers = filas[0].map(h => limpiarString(h.toLowerCase()));

    const idxId = headers.indexOf('id');
    const idxNombre = headers.indexOf('name_desc');
    const idxCedula = headers.indexOf('document_id');

    if (idxId === -1 || idxNombre === -1) {
        console.error("❌ ERROR: El CSV no tiene las columnas 'id' o 'name_desc'.");
        return;
    }

    console.log(`📋 Cargados ${filas.length - 1} desaparecidos. Reanudando desde línea 32295...`);
    
    // REANUDACIÓN: no sobreescribir el SQL existente
    // fs.writeFileSync(ARCHIVO_SALIDA_SQL, "-- SCRIPT FRANCOTIRADOR DE HOSPITALES\n\n", 'utf-8');

    let exitos = 6639; // ya encontrados antes de la interrupción

    for (let i = 32295; i < filas.length; i++) {
        const row = filas[i];
        const uuid = limpiarString(row[idxId]);
        const nombreDesc = limpiarString(row[idxNombre]);
        const cedula = idxCedula !== -1 ? limpiarString(row[idxCedula]) : '';

        if (!uuid || !nombreDesc) continue;

        let terminoBusqueda = '';
        if (cedula && cedula.length >= 5) {
            terminoBusqueda = cedula;
        } else {
            const partes = nombreDesc.split(' ');
            if (partes.length >= 2) {
                terminoBusqueda = `${partes[0]} ${partes[1]}`;
            } else {
                terminoBusqueda = partes[0];
            }
        }

        if (terminoBusqueda.length < 4) continue;

        process.stdout.write(`\r🔍 [${i}/${filas.length - 1}] Consultando API por: ${terminoBusqueda}... (Éxitos: ${exitos})`);

        try {
            const respuesta = await fetch(API_URL, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({ p_term: terminoBusqueda })
            });

            if (respuesta.ok) {
                const datos = await respuesta.json();
                if (datos && datos.length > 0) {
                    exitos++;
                    const hospitalDestino = datos[0].hospital || datos[0].centro || 'Hospitalizado (Red Pública)';
                    const hospitalLimpio = hospitalDestino.replace(/'/g, "''");

                    const sqlUpdate = `UPDATE persons SET status = 'herido', location_text = 'INGRESADO: ${hospitalLimpio}', updated_at = NOW() WHERE id = '${uuid}';\n`;
                    fs.appendFileSync(ARCHIVO_SALIDA_SQL, sqlUpdate, 'utf-8');
                }
            }
            await new Promise(r => setTimeout(r, 200));

        } catch (error) {
            // Ignorar errores de red para no detener el script
        }
    }

    console.log(`\n\n🎉 ¡OPERACIÓN FINALIZADA!`);
    console.log(`🎯 Se encontraron ${exitos} personas en los hospitales.`);
}

dispararFrancotirador();
