const fs = require('fs');

const BASE_URL = "https://desaparecidos-terremoto-api.theempire.tech/api/personas";
const PAGE_SIZE = 100;
const ARCHIVO_SALIDA = "personas_desaparecidas_completo.csv";

// Headers para simular un navegador real (Chrome en Windows) y evadir bloqueos WAF/Anti-Bot
const HEADERS_NAVEGADOR = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Referer": "https://desaparecidos-terremoto-api.theempire.tech/",
    "Connection": "keep-alive"
};

async function obtenerDatos() {
    let page = 1;
    let totalDescargados = 0;
    const todosLosRegistros = [];

    console.log(`\n🚀 Iniciando descarga (v2 Anti-Bot)... (Pidiendo ${PAGE_SIZE} registros por página)\n`);

    while (true) {
        const url = `${BASE_URL}?page=${page}&pageSize=${PAGE_SIZE}`;

        try {
            const respuesta = await fetch(url, {
                method: 'GET',
                headers: HEADERS_NAVEGADOR
            });

            if (!respuesta.ok) {
                throw new Error(`HTTP ${respuesta.status} - ${respuesta.statusText}`);
            }

            const datosJson = await respuesta.json();
            const items = datosJson.items ? datosJson.items : datosJson;

            if (!items || items.length === 0) {
                console.log("\n✅ ¡No hay más registros! Se alcanzó el final de la base de datos.");
                break;
            }

            todosLosRegistros.push(...items);
            totalDescargados += items.length;

            console.log(`Página ${page} descargada. Total acumulado: ${totalDescargados} personas.`);

            page++;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Aumentamos la pausa a 1s para mayor seguridad

        } catch (error) {
            console.error(`\n⚠️ Error en la página ${page}: ${error.message}`);

            // Si falla y no hemos descargado nada, generamos un registro de diagnóstico
            if (todosLosRegistros.length === 0) {
                console.log("Generando CSV de diagnóstico con los detalles del error...");
                todosLosRegistros.push({
                    id_diagnostico: "ERROR_API",
                    estado_http: error.message,
                    endpoint_probado: url,
                    posible_causa: "La API puede requerir un Token de Autorización Bearer o tiene un WAF estricto.",
                    fecha_intento: new Date().toISOString()
                });
            }
            break;
        }
    }
    return todosLosRegistros;
}

function guardarEnCSV(datos, nombreArchivo) {
    if (!datos || datos.length === 0) {
        console.log("No hay datos para guardar.");
        return;
    }

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

    console.log(`\n📁 ¡ÉXITO! Archivo guardado: '${nombreArchivo}'`);
}

obtenerDatos().then(datos => guardarEnCSV(datos, ARCHIVO_SALIDA));