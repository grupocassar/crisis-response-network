require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');

const URL_BASE = process.env.SUPABASE_URL;
const API_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';

if (!URL_BASE || !API_KEY) {
    console.error("❌ ERROR: Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env");
    process.exit(1);
}

// 1. Generador de Huella Digital ESTRICTO
function getHuellaFonetica(searchName) {
    if (!searchName) return null;
    // Quitamos conectores comunes para no ensuciar la huella
    let limpio = searchName.replace(/\b(de|del|la|las|los|el|y)\b/g, ' ').replace(/\s+/g, ' ').trim();
    const palabras = limpio.split(' ').filter(w => w.length > 2);
    
    // Exigimos 3 palabras clave (Ej: guillermo alejandro marquina) para que sea seguro
    if (palabras.length >= 3) return `${palabras[0]} ${palabras[1]} ${palabras[2]}`;
    // Si solo tiene 2, las unimos, pero es más riesgoso
    if (palabras.length === 2) return `${palabras[0]} ${palabras[1]}`;
    return null;
}

async function extraerDatos() {
    let offset = 0;
    const limit = 1000;
    const todos = [];
    
    console.log("==================================================================");
    console.log("🕵️‍♂️ INICIANDO SABUESO V2: MODO ALTA PRECISIÓN (ANTI-HOMÓNIMOS)");
    console.log("==================================================================\n");
    process.stdout.write("📥 Descargando censo civil a la memoria RAM...");

    while (true) {
        const res = await fetch(`${URL_BASE}/rest/v1/persons?incident_id=eq.${INCIDENT_ID}&select=id,name_desc,status,document_id,search_name&limit=${limit}&offset=${offset}`, {
            headers: { 'apikey': API_KEY, 'Authorization': `Bearer ${API_KEY}` }
        });
        
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const data = await res.json();
        
        if (data.length === 0) break;
        todos.push(...data);
        offset += limit;
        process.stdout.write(`\r📥 Descargando censo civil a la memoria RAM... ${todos.length} registros`);
    }
    console.log("\n✅ Base de datos clonada en memoria exitosamente.\n");
    return todos;
}

async function procesar() {
    const data = await extraerDatos();
    console.log("🔍 Analizando colisiones estrictas...");

    const gruposCedula = new Map();
    const gruposHuella = new Map();

    for (const p of data) {
        if (p.document_id && p.document_id.length > 5 && !p.document_id.includes('00000')) {
            if (!gruposCedula.has(p.document_id)) gruposCedula.set(p.document_id, []);
            gruposCedula.get(p.document_id).push(p);
        }
        const huella = getHuellaFonetica(p.search_name);
        if (huella) {
            if (!gruposHuella.has(huella)) gruposHuella.set(huella, []);
            gruposHuella.get(huella).push(p);
        }
    }

    const conflictosDetectados = new Map(); 
    let catA = 0, catB = 0, catC = 0;

    const analizarGrupo = (grupo, tipo) => {
        // REGLA DE ORO: Si hay más de 6 personas en este grupo, son HOMÓNIMOS (Ej: Maria Rodriguez).
        // Nadie crea 7 clones por accidente. Lo ignoramos para evitar falsos positivos masivos.
        if (grupo.length < 2 || (tipo === 'huella' && grupo.length > 6)) return;
        
        for (let i = 0; i < grupo.length; i++) {
            for (let j = i + 1; j < grupo.length; j++) {
                const p1 = grupo[i];
                const p2 = grupo[j];
                
                const parId = [p1.id, p2.id].sort().join('_');
                if (conflictosDetectados.has(parId)) continue;

                if (p1.status === p2.status) {
                    catA++;
                } else {
                    const isFallecido = p1.status === 'fallecido' || p2.status === 'fallecido';
                    const categoria = isFallecido ? 'C' : 'B';
                    if (isFallecido) catC++; else catB++;
                    
                    conflictosDetectados.set(parId, {
                        p1_id: p1.id, p1_name: p1.name_desc, p1_status: p1.status,
                        p2_id: p2.id, p2_name: p2.name_desc, p2_status: p2.status,
                        similitud: tipo === 'cedula' ? 100 : 85, 
                        categoria: categoria
                    });
                }
            }
        }
    };

    gruposCedula.forEach(g => analizarGrupo(g, 'cedula'));
    gruposHuella.forEach(g => analizarGrupo(g, 'huella'));

    console.log("\n📊 RESULTADOS DEL SABUESO V2:");
    console.log(`   🟢 Cat A (Clones sin riesgo / Mismo estado): ${catA}`);
    console.log(`   🟡 Cat B (Contradicción difusa sin fallecidos): ${catB}`);
    console.log(`   🔴 Cat C (¡ALERTA! Contradicciones con fallecidos): ${catC}`);

    if (conflictosDetectados.size > 0) {
        console.log(`\n📦 Empaquetando ${catB + catC} conflictos REALES para la Mesa de Resolución...`);
        
        const sqlStatements = [
            "TRUNCATE TABLE conflict_staging;\n",
            "INSERT INTO conflict_staging (person_1_id, person_1_name, person_1_status, person_2_id, person_2_name, person_2_status, similarity_score, risk_category) VALUES"
        ];

        const values = [];
        conflictosDetectados.forEach(c => {
            const escape = (str) => "'" + str.replace(/'/g, "''") + "'";
            values.push(`('${c.p1_id}', ${escape(c.p1_name)}, '${c.p1_status}', '${c.p2_id}', ${escape(c.p2_name)}, '${c.p2_status}', ${c.similitud}, '${c.categoria}')`);
        });

        sqlStatements.push(values.join(',\n') + ';');
        fs.writeFileSync('llenar_boveda_conflictos.sql', sqlStatements.join('\n'));
        
        console.log(`✅ Archivo 'llenar_boveda_conflictos.sql' regenerado limpio.`);
        console.log(`👉 AHORA SÍ, EJECUTA: npm run db:sql -- llenar_boveda_conflictos.sql`);
    } else {
        console.log("\n🎉 ¡Felicidades! Tu base de datos está 100% limpia.");
    }
}

procesar().catch(console.error);
