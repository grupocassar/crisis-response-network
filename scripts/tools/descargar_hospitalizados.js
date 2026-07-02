const fs = require('fs');

const API_URL = "https://ozuxfepfkvnxkywdsqxy.supabase.co/rest/v1/rpc/buscar_paciente";

// Cabeceras oficiales con las credenciales que interceptamos de tu navegador
const HEADERS = {
    "accept": "*/*",
    "accept-language": "es-419,es;q=0.9,en;q=0.8,fi;q=0.7,en-GB;q=0.6,en-US;q=0.5,es-VE;q=0.4",
    "content-type": "application/json",
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dXhmZXBma3ZueGt5d2RzcXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjI5NTEsImV4cCI6MjA5Nzk5ODk1MX0.YhW0GalGkQZdO2NJTg_01C5XhdMmJ6RbNSNXXC0xG4o",
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96dXhmZXBma3ZueGt5d2RzcXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI0MjI5NTEsImV4cCI6MjA5Nzk5ODk1MX0.YhW0GalGkQZdO2NJTg_01C5XhdMmJ6RbNSNXXC0xG4o",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Microsoft Edge\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "cross-site",
    "Referer": "https://hospitalesenvenezuela.com/"
};

// 430 Sílabas y prefijos más comunes de nombres/apellidos en español
const PREFIJOS_HISPANOS = [
    "aba", "abr", "acu", "ada", "adi", "adr", "agu", "ala", "alb", "alc", "ald", "ale", "alf", "alg", "ali", "alm", "alo", "alv", "ama", "ame", "ami", "amo", "ana", "and", "ang", "ani", "ant", "apa", "apo", "aqu", "ara", "arc", "ard", "are", "arg", "ari", "arm", "arn", "aro", "arr", "art", "asc", "ast", "asu", "ati", "aud", "aur", "ave", "aza", "bac", "bad", "bal", "bar", "bas", "bea", "bel", "ben", "ber", "bet", "bia", "bla", "bol", "bon", "bor", "bra", "bre", "bri", "bro", "bru", "bry", "bus", "cab", "cac", "cad", "cai", "cal", "cam", "can", "cap", "car", "cas", "cat", "ceb", "cec", "ced", "cel", "cen", "cer", "ces", "cha", "che", "chi", "cho", "chu", "cia", "cid", "cin", "cir", "cla", "cle", "cob", "coc", "col", "con", "cop", "cor", "cos", "cot", "coy", "cre", "cri", "cru", "cua", "cue", "cum", "cur", "dai", "dal", "dam", "dan", "dar", "dav", "day", "deb", "dec", "dei", "del", "dem", "den", "der", "des", "dey", "dia", "die", "dil", "dio", "dix", "dom", "don", "dor", "dos", "dou", "dub", "duv", "edg", "edi", "edm", "edn", "edo", "edw", "egl", "eir", "ela", "ele", "eli", "elv", "ely", "ema", "emi", "enm", "enr", "eny", "era", "eri", "ern", "esm", "esp", "est", "eud", "eug", "eva", "eve", "fab", "faj", "fal", "fan", "far", "fed", "fel", "fer", "fid", "fig", "fil", "flo", "fra", "fre", "gab", "gae", "gal", "gam", "gar", "gas", "gen", "geo", "ger", "gil", "gis", "gla", "gle", "glo", "god", "gom", "gon", "gra", "gre", "gri", "gua", "gud", "gue", "gui", "gus", "gut", "hab", "hai", "har", "hay", "heb", "hec", "hei", "hel", "hen", "her", "hid", "hil", "hor", "hug", "iba", "ibe", "ign", "ile", "ilo", "ils", "ind", "ine", "ing", "ira", "iri", "irm", "isa", "isb", "ism", "iso", "iva", "ivo", "jac", "jad", "jai", "jam", "jas", "jav", "jay", "jea", "jef", "jei", "jen", "jer", "jes", "jha", "jhe", "jho", "jim", "joa", "joe", "joh", "jol", "jon", "jor", "jos", "jua", "jud", "jul", "jun", "jus", "kar", "kat", "kei", "kel", "ken", "ker", "kim", "kli", "kri", "lau", "lay", "lea", "leo", "les", "let", "lia", "lid", "lil", "lin", "lio", "lis", "liz", "loi", "lol", "lor", "lou", "lua", "luc", "lui", "lum", "luv", "mai", "man", "mar", "mas", "mat", "may", "mel", "mer", "mic", "mig", "mil", "min", "mir", "mis", "moi", "mor", "nad", "nah", "nai", "nay", "naz", "nef", "neg", "nei", "nel", "ner", "nes", "nia", "nic", "nin", "nir", "noh", "nor", "nur", "obd", "oda", "odi", "olg", "oli", "oma", "ome", "ora", "ore", "ori", "orl", "oro", "osa", "osc", "osm", "osw", "ote", "pab", "pac", "pad", "pam", "pao", "pat", "pau", "ped", "peg", "pen", "per", "pim", "pin", "pla", "pol", "por", "pur", "rad", "rae", "raf", "rai", "ram", "ran", "rau", "ray", "reb", "rei", "ren", "ric", "rin", "rob", "rod", "roe", "rog", "roi", "rol", "rom", "ron", "ros", "roy", "rub", "rud", "run", "rus", "sai", "sal", "sam", "san", "sar", "sau", "seb", "sel", "ser", "sha", "she", "shi", "sil", "sin", "sol", "son", "sof", "sop", "sur", "sus", "tha", "thi", "tib", "tom", "ton", "tri", "tul", "uli", "uri", "val", "van", "vec", "via", "vic", "vil", "vio", "viv", "wal", "wil", "wla", "wol", "wui", "xad", "xav", "xio", "yad", "yaj", "yal", "yan", "yar", "yas", "yau", "yaz", "yei", "yel", "yem", "yen", "yer", "yes", "yim", "yin", "yit", "yon", "yor", "yos", "yov", "you", "yub", "yud", "yul", "yum", "yun", "yur", "yus", "zai", "zen", "zul", "zur"
];

async function probarApi(p_term) {
    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify({ p_term })
        });
        if (!respuesta.ok) return null;
        const datos = await respuesta.json();
        return datos;
    } catch {
        return null;
    }
}

async function extraerTodosLosPacientes() {
    console.log("🚀 Iniciando auto-sondeo de seguridad de la API...");
    
    // 1. Prueba reina con "maria" (5 letras) para verificar si las credenciales son válidas
    const pruebaReina = await probarApi("maria");
    if (!pruebaReina || pruebaReina.length === 0) {
        console.log("\n❌ ERROR CRÍTICO: Las credenciales (API Key o Token) no son válidas o han expirado.");
        console.log("👉 Por favor, abre la página hospitalesenvenezuela.com, haz una búsqueda manual con F12 abierto,");
        console.log("   y copia el nuevo Token de Autorización para actualizar las constantes en este script.\n");
        return;
    }
    console.log("🟢 Conexión exitosa. Las credenciales son válidas.");
    
    // 2. Probar longitud del término aceptado para ver el límite del servidor
    let longitudAceptada = 5;
    const test3 = await probarApi("mar");
    
    if (test3 && test3.length > 0) {
        console.log("🟢 Confirmado: La API acepta búsquedas de 3 letras.");
        longitudAceptada = 3;
    } else {
        const test4 = await probarApi("mari");
        if (test4 && test4.length > 0) {
            console.log("🟢 Confirmado: La API requiere mínimo 4 letras.");
            longitudAceptada = 4;
        } else {
            console.log("🟢 Confirmado: La API requiere mínimo 5 letras.");
            longitudAceptada = 5;
        }
    }

    // 3. Definir términos de búsqueda según la longitud requerida
    let terminosDeBusqueda = [];
    if (longitudAceptada === 3) {
        terminosDeBusqueda = PREFIJOS_HISPANOS;
    } else if (longitudAceptada === 4) {
        // Expandimos agregando una vocal a cada prefijo
        const vocales = ['a', 'e', 'i', 'o', 'u'];
        for (let prefijo of PREFIJOS_HISPANOS) {
            for (let v of vocales) {
                terminosDeBusqueda.push(prefijo + v);
            }
        }
    } else {
        // Si requiere 5 letras, combinamos con terminaciones hipercomunes en español
        const terminaciones = ['ia', 'es', 'an', 'ez', 'al', 'on', 'os', 'ar'];
        for (let prefijo of PREFIJOS_HISPANOS) {
            for (let term of terminaciones) {
                terminosDeBusqueda.push(prefijo + term);
            }
        }
    }

    console.log(`\n📚 Total de combinaciones seguras a barrer: ${terminosDeBusqueda.length}`);
    console.log("⏳ Iniciando extracción masiva. Por favor, ten paciencia...\n");

    let pacientesExtraidos = [];
    let huellasVistas = new Set();
    let contadorConsultas = 0;

    for (let term of terminosDeBusqueda) {
        contadorConsultas++;
        process.stdout.write(`\r[${contadorConsultas}/${terminosDeBusqueda.length}] Probando término '${term}'... Encontrados: ${pacientesExtraidos.length} únicos`);
        
        try {
            const respuesta = await fetch(API_URL, {
                method: 'POST',
                headers: HEADERS,
                body: JSON.stringify({ p_term: term })
            });

            if (!respuesta.ok) continue;

            const datos = await respuesta.json();
            
            if (datos && datos.length > 0) {
                for (let paciente of datos) {
                    // Generamos huella digital única para evitar duplicar
                    let huella = paciente.id || paciente.cedula || JSON.stringify(paciente);
                    if (!huellasVistas.has(huella)) {
                        huellasVistas.add(huella);
                        pacientesExtraidos.push(paciente);
                    }
                }
            }
            
            // Pausa adaptativa de 100ms
            await new Promise(r => setTimeout(r, 100));
            
        } catch (error) {
            // Ignorar errores temporales
        }
    }

    console.log(`\n\n🎉 ¡Extracción completada con éxito rotundo!`);
    console.log(`👥 Pacientes únicos recuperados de forma limpia: ${pacientesExtraidos.length}`);
    
    if (pacientesExtraidos.length > 0) {
        guardarEnCSV(pacientesExtraidos, 'pacientes_hospitalizados_crudos.csv');
    }
}

function guardarEnCSV(datos, nombreArchivo) {
    const columnas = Object.keys(datos[0]);
    const cabecera = columnas.join(',') + '\n';
    
    const filas = datos.map(fila => {
        return columnas.map(col => {
            let valor = fila[col] !== null && fila[col] !== undefined ? String(fila[col]) : '';
            if (valor.includes(',') || valor.includes('"') || valor.includes('\n')) {
                valor = `"${valor.replace(/"/g, '""')}"`;
            }
            return valor;
        }).join(',');
    }).join('\n');
    
    fs.writeFileSync(nombreArchivo, cabecera + filas, 'utf-8');
    console.log(`💾 Base de datos guardada localmente: '${nombreArchivo}'`);
}

extraerTodosLosPacientes();