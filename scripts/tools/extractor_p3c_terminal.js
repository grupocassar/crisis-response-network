const fs = require('fs');

const INICIO = 11626;
const PAUSA_MS = 800; 

const V = ['a','e','i','o','u','á','é','í','ó','ú'];
const C = ['b','c','d','f','g','h','j','l','m','n','ñ','p','q','r','s','t','v','x','y','z'];
const TERMS = new Set();
for (const c1 of C) for (const v of V) for (const c2 of C) TERMS.add(c1+v+c2); 
for (const v1 of V) for (const c of C) for (const v2 of V) TERMS.add(v1+c+v2); 
for (const c1 of C) for (const c2 of C) for (const v of V) TERMS.add(c1+c2+v); 
for (const v of V) for (const c1 of C) for (const c2 of C) TERMS.add(v+c1+c2); 
['jos','mar','car','gon','rod','per','ram','san','tor','var'].forEach(s => TERMS.add(s));
const LISTA = [...TERMS];

async function ejecutarP3C() {
    console.log(`🚀 INICIANDO FASE P3C: Índices ${INICIO} a ${LISTA.length}...`);
    let registros = [];
    let huellas = new Set();
    let backoff = 10000; 

    for (let i = INICIO; i < LISTA.length; i++) {
        const term = LISTA[i];
        process.stdout.write(`\r🔍 [${i}/${LISTA.length}] Atacando: '${term}'... (Capturados: ${registros.length})`);

        try {
            const res = await fetch('https://redayudavenezuela.com/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ op: 'search_people', term: term })
            });

            if (res.status === 429) {
                console.log(`\n⚠️ Rate Limit en '${term}'. Pausando ${backoff/1000}s...`);
                await new Promise(r => setTimeout(r, backoff));
                backoff = Math.min(backoff * 2, 60000); 
                i--; // Repetir trigrama
                continue;
            }

            if (res.ok) {
                const data = await res.json();
                let items = Array.isArray(data) ? data : (data.data || []);
                for (let p of items) {
                    let nom = p.name || p.nombre || '';
                    let det = p.detail || p.location || '';
                    let huella = `${nom}|${det.substring(0,30)}`.toLowerCase();
                    if (!huellas.has(huella)) {
                        huellas.add(huella);
                        registros.push(p);
                    }
                }
            }
            backoff = 10000; 
            await new Promise(r => setTimeout(r, PAUSA_MS));
        } catch (e) {
            console.log(`\n⚠️ Error de red. Pausando 5s...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    if (registros.length > 0) {
        const cols = Object.keys(registros[0]);
        const csv = cols.join(',') + '\n' + registros.map(r => cols.map(c => {
            let v = r[c] ? String(r[c]).replace(/[\r\n]+/g, ' ') : '';
            return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(',')).join('\n');
        fs.writeFileSync(`eve_parte3C_final_${registros.length}.csv`, csv, 'utf-8');
        console.log(`\n🎉 FASE P3C COMPLETADA. Archivo CSV generado.`);
    }
}
ejecutarP3C();
