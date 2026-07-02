const fs = require('fs');

// Configuración de la extracción masiva maestra (Base de Datos Completa)
const BASE_URL_PREFIX = "https://venezuelatebusca.com/_root.data?_routes=routes%2F_index&page=";
const ARCHIVO_SALIDA = "base_maestra_completa_venezuela.csv";
const ARCHIVO_CHECKPOINT = "base_maestra_checkpoint.json";
const TIEMPO_PAUSA_MS = 1000; // 1 segundo de pausa para cuidar la estabilidad de la conexión

// Cookies y headers reales que interceptamos de tu navegador Edge en Windows 10
// Esta combinación evita de forma nativa que Cloudflare rechace la petición con 403
const HEADERS = {
    "accept": "*/*",
    "accept-language": "es-419,es;q=0.9,en;q=0.8,fi;q=0.7,en-GB;q=0.6,en-US;q=0.5,es-VE;q=0.4",
    "sec-ch-ua": "\"Microsoft Edge\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
    "cookie": "cf_clearance=DNJO8I0RKRrw_FBFK7xuXFQBHU49.2hXCEta2BnCJ2U-1782493656-1.2.1.1-_soRgwudMyUyAFcAwLcTOOedYEWsq7CS4SRbS_cv8xo2r6OGJSqaeNsLzEZ7UeMfuNvgfbpZGrL3PO7N5rdafg7JkSWGmUzZL9uARUL4B0Udwb1K_mtY5T_qGGIaW6QEz5DKXZX6FwPuzda9rFi6JK_xLkVmReeF4jkE0wDsvkA3jeI9J6tDbsVW6Lne9nJdf8z_mZubB1vjpKWTWhQf1pcvHu2NjMthWpNpcoO1glcIV9XGP1HtWrUCVEdMlR4yfp0GP.HaUE0amUwkhJxlieydLqdOdPNPdxxdNRQIVpLibF2AK0lAHC5B9_arez7mfMjn.Oh04Jw50WoQXLVjFw",
    "Referer": "https://venezuelatebusca.com/"
};

// Decodificador avanzado de Remix Server Components (Abre los punteros y reconstruye los objetos planos)
function decodificarRemix(data) {
    if (!Array.isArray(data)) return [];
    let cache = new Map();
    
    function resolve(index) {
        if (typeof index !== 'number') return index;
        if (index < 0) return "";
        if (cache.has(index)) return cache.get(index);
        
        let val = data[index];
        if (typeof val === 'string' || typeof val === 'boolean' || typeof val === 'number' || val === null) {
            return val;
        }
        if (Array.isArray(val)) {
            let arr = [];
            cache.set(index, arr);
            for (let i = 0; i < val.length; i++) arr.push(resolve(val[i]));
            return arr;
        }
        if (typeof val === 'object') {
            let obj = {};
            cache.set(index, obj);
            for (let key in val) {
                if (key.startsWith('_')) {
                    let keyIndex = parseInt(key.substring(1));
                    let realKey = resolve(keyIndex);
                    obj[realKey] = resolve(val[key]);
                } else {
                    obj[key] = resolve(val[key]);
                }
            }
            return obj;
        }
        return val;
    }
    
    let root = resolve(0);
    let personsArray = [];
    
    function findPersons(obj, visited = new Set()) {
        if (!obj || typeof obj !== 'object') return;
        if (visited.has(obj)) return;
        visited.add(obj);
        
        if (obj.persons && Array.isArray(obj.persons)) {
            personsArray = obj.persons;
            return;
        }
        for (let key in obj) {
            if (personsArray.length > 0) return;
            findPersons(obj[key], visited);
        }
    }
    
    findPersons(root);
    return personsArray;
}

// Convierte un objeto JSON plano a una fila limpia de CSV sanitizando saltos de línea internos
function objetoACsvFila(objeto, columnas) {
    return columnas.map(col => {
        let valor = objeto[col];
        if (valor !== null && typeof valor === 'object') valor = JSON.stringify(valor);
        valor = valor !== null && valor !== undefined ? String(valor) : '';
        
        // Evitamos que los enters internos corrompan la estructura de las columnas en el CSV
        valor = valor.replace(/(\r\n|\n|\r)/gm, " - ");
        
        if (valor.includes(',') || valor.includes('"')) {
            valor = `"${valor.replace(/"/g, '""')}"`;
        }
        return valor;
    }).join(',') + '\n';
}

async function iniciarExtraccion() {
    console.log("=================================================================");
    console.log("🚨 INICIANDO EXTRACCIÓN MAESTRA CON BYPASS DIRECTO CLOUDFLARE  🚨");
    console.log("=================================================================\n");

    let page = 1;
    let totalDescargados = 0;
    let columnasDefinidas = false;
    let columnas = [];
    let idsVistos = new Set();
    let erroresConsecutivos = 0;

    // Cargar Checkpoint para reanudación automática si se cae la sesión
    if (fs.existsSync(ARCHIVO_CHECKPOINT) && fs.existsSync(ARCHIVO_SALIDA)) {
        try {
            const checkpoint = JSON.parse(fs.readFileSync(ARCHIVO_CHECKPOINT, 'utf-8'));
            page = checkpoint.page || 1;
            totalDescargados = checkpoint.totalDescargados || 0;
            columnas = checkpoint.columnas || [];
            columnasDefinidas = columnas.length > 0;
            idsVistos = new Set(checkpoint.idsVistos || []);
            console.log(`♻️ ¡Checkpoint activo encontrado! Reanudando en Página ${page}. Total acumulado: ${totalDescargados}`);
        } catch (e) {
            console.log("⚠️ Checkpoint ilegible. Iniciando extracción limpia.");
        }
    } else {
        console.log("📝 Iniciando descarga desde la página 1.");
        if (fs.existsSync(ARCHIVO_SALIDA)) fs.unlinkSync(ARCHIVO_SALIDA);
    }

    while (true) {
        const url = `${BASE_URL_PREFIX}${page}`;
        try {
            const respuesta = await fetch(url, { headers: HEADERS });
            
            if (respuesta.status === 403) {
                console.error(`\n\n❌ ERROR 403: Cloudflare ha rechazado la cookie 'cf_clearance' en la página ${page}.`);
                console.log("💡 Tu sesión ha expirado en el navegador. Por favor, abre venezuelatebusca.com de nuevo, resuelve el captcha, copia la nueva cookie y actualízala aquí.");
                break;
            }

            if (!respuesta.ok) {
                throw new Error(`HTTP ${respuesta.status}`);
            }

            const datosCrudos = await respuesta.json();
            const personasReales = decodificarRemix(datosCrudos);

            if (!personasReales || personasReales.length === 0) {
                console.log("\n\n✅ [ÉXITO TOTAL] ¡Extracción completa finalizada con éxito!");
                if (fs.existsSync(ARCHIVO_CHECKPOINT)) fs.unlinkSync(ARCHIVO_CHECKPOINT);
                break;
            }

            // Definición de cabeceras dinámicas con el primer lote de datos
            if (!columnasDefinidas && personasReales.length > 0) {
                const setColumnas = new Set();
                personasReales.forEach(p => Object.keys(p).forEach(k => setColumnas.add(k)));
                columnas = Array.from(setColumnas);
                fs.writeFileSync(ARCHIVO_SALIDA, columnas.join(',') + '\n', 'utf-8');
                columnasDefinidas = true;
            }

            let filasNuevas = [];
            let clonesDetectados = 0;

            for (let persona of personasReales) {
                let idUnico = persona.id || persona.idNumber || JSON.stringify(persona);
                if (!idsVistos.has(idUnico)) {
                    idsVistos.add(idUnico);
                    filasNuevas.push(objetoACsvFila(persona, columnas));
                } else {
                    clonesDetectados++;
                }
            }

            if (filasNuevas.length > 0) {
                fs.appendFileSync(ARCHIVO_SALIDA, filasNuevas.join(''), 'utf-8');
                totalDescargados += filasNuevas.length;
            }

            // Impresión dinámica de progreso en consola
            process.stdout.write(`\r📥 Progreso: Página ${page} | Capturados: ${totalDescargados} | Clones Omitidos: ${clonesDetectados}`);

            // Prevención de bucles de paginación circular infinitos
            if (filasNuevas.length === 0 && clonesDetectados > 0) {
                console.log("\n\n🔁 [Bucle detectado] El servidor ha vuelto a entregar registros duplicados. Deteniendo.");
                if (fs.existsSync(ARCHIVO_CHECKPOINT)) fs.unlinkSync(ARCHIVO_CHECKPOINT);
                break;
            }

            // Escribir el estado actual en el archivo de checkpoint de inmediato
            const estado = {
                page: page + 1,
                totalDescargados: totalDescargados,
                columnas: columnas,
                idsVistos: Array.from(idsVistos)
            };
            fs.writeFileSync(ARCHIVO_CHECKPOINT, JSON.stringify(estado, null, 2), 'utf-8');

            page++;
            erroresConsecutivos = 0;
            
            await new Promise(resolve => setTimeout(resolve, TIEMPO_PAUSA_MS));

        } catch (error) {
            console.error(`\n\n⚠️ Error de comunicación en la página ${page}: ${error.message}`);
            erroresConsecutivos++;
            
            if (erroresConsecutivos >= 3) {
                console.log("❌ Demasiados reintentos fallidos de red. Pausando. Tu progreso está guardado de forma segura en el checkpoint.");
                break;
            }
            
            console.log("Esperando 4 segundos para reintentar...");
            await new Promise(resolve => setTimeout(resolve, 4000));
        }
    }

    console.log("\n=================================================================");
    console.log(`💾 Archivo consolidado guardado en: '${ARCHIVO_SALIDA}'`);
    console.log(`👥 Total de personas unificadas sin clones: ${totalDescargados}`);
    console.log("=================================================================");
}

iniciarExtraccion();