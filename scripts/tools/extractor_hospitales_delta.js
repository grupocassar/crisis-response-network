const fs = require('fs');

const API_URL = "https://ozuxfepfkvnxkywdsqxy.supabase.co/rest/v1/rpc/buscar_paciente";
const HEADERS = {
    "accept": "*/*",
    "content-type": "application/json",
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dXhmZXBma3ZueGt5d2RzcXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjI5NTEsImV4cCI6MjA5Nzk5ODk1MX0.YhW0GalGkQZdO2NJTg_01C5XhdMmJ6RbNSNXXC0xG4o",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dXhmZXBma3ZueGt5d2RzcXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjI5NTEsImV4cCI6MjA5Nzk5ODk1MX0.YhW0GalGkQZdO2NJTg_01C5XhdMmJ6RbNSNXXC0xG4o"
};

// Generador de sílabas de 3 letras (Para un barrido ultra-rápido de la API)
const PREFIJOS = ["aba", "car", "mar", "ale", "dan", "jos", "lui", "gab", "and", "fer", "mig", "ped", "raf", "ant", "jes", "bea", "cat", "dia", "ele", "fab", "gen", "hec", "ign", "jul", "kar", "leo", "man", "nat", "osc", "pab", "qui", "rob", "sam", "ter", "urs", "vic", "wal", "xav", "yan", "zac"];

async function escanearHospitales() {
    console.log("=====================================================================");
    console.log("🏥 INICIANDO ESCÁNER DELTA DE HOSPITALES (LOS 782 NUEVOS INGRESOS)");
    console.log("=====================================================================\n");
    
    let pacientesExtraidos = [];
    let huellasVistas = new Set();
    
    for (let term of PREFIJOS) {
        process.stdout.write(`\r🔍 Escaneando API de hospitales por '${term}'... (Atrapados: ${pacientesExtraidos.length})`);
        
        try {
            const respuesta = await fetch(API_URL, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({ p_term: term })
            });

            if (respuesta.ok) {
                const datos = await respuesta.json();
                if (datos && datos.length > 0) {
                    for (let paciente of datos) {
                        let huella = paciente.id || paciente.cedula || JSON.stringify(paciente);
                        if (!huellasVistas.has(huella)) {
                            huellasVistas.add(huella);
                            pacientesExtraidos.push(paciente);
                        }
                    }
                }
            }
            await new Promise(r => setTimeout(r, 100)); // Pausa de seguridad
        } catch (e) {}
    }

    console.log(`\n\n✅ Escaneo completado. Se recuperaron ${pacientesExtraidos.length} pacientes.`);
    
    if (pacientesExtraidos.length === 0) return;

    let sqlStatements = [
        "-- =====================================================================",
        "-- CRUCE DELTA: NUEVOS INGRESOS HOSPITALARIOS (ÚLTIMAS 6 HORAS)",
        "-- =====================================================================\n",
        "CREATE TEMP TABLE temp_hosp_delta (p0 VARCHAR, p1 VARCHAR, cedula_limpia VARCHAR, hospital VARCHAR);\n",
        "INSERT INTO temp_hosp_delta (p0, p1, cedula_limpia, hospital) VALUES"
    ];

    let values = [];
    for (let p of pacientesExtraidos) {
        let nombre = p.nombre || p.name || '';
        let apellido = p.apellido || p.lastName || '';
        let cedula = p.cedula || p.doc || '';
        let hospital = p.hospital || p.centro || 'Hospitalizado (Red Pública)';
        
        let p0_sql = 'NULL', p1_sql = 'NULL', ced_sql = 'NULL';
        
        if (nombre) {
            let parts = nombre.split(' ');
            p0_sql = `'${parts[0].replace(/'/g, "''")}'`;
            if (parts[1]) p1_sql = `'${parts[1].replace(/'/g, "''")}'`;
            else if (apellido) p1_sql = `'${apellido.split(' ')[0].replace(/'/g, "''")}'`;
        }
        
        if (cedula && cedula.length > 5) ced_sql = `'${cedula.replace(/[^0-9]/g, '')}'`;
        let hosp_sql = `'${hospital.replace(/'/g, "''")}'`;
        
        if (p0_sql !== 'NULL' || ced_sql !== 'NULL') {
            values.push(`(${p0_sql}, ${p1_sql}, ${ced_sql}, ${hosp_sql})`);
        }
    }

    sqlStatements.push(values.join(',\n') + ';\n');
    
    sqlStatements.push(`UPDATE persons p SET status = 'herido', location_text = 'INGRESADO: ' || t.hospital, updated_at = NOW() FROM temp_hosp_delta t WHERE p.incident_id = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf' AND p.status = 'buscado' AND ((t.cedula_limpia IS NOT NULL AND REPLACE(p.document_id, '.', '') = t.cedula_limpia) OR (t.p0 IS NOT NULL AND p.name_desc ILIKE '%' || t.p0 || '%' AND (t.p1 IS NULL OR p.name_desc ILIKE '%' || t.p1 || '%')));\n`);
    sqlStatements.push("DROP TABLE temp_hosp_delta;");

    fs.writeFileSync('cruce_hospitales_delta.sql', sqlStatements.join('\n'));
    console.log(`🚀 Generado: 'cruce_hospitales_delta.sql'. ¡Ejecútalo en Supabase!`);
}
escanearHospitales();
