const fs = require('fs');

const BASE_URL = "https://desaparecidos-terremoto-api.theempire.tech/api/personas";
const PAGE_SIZE = 100; // Paginación de 100 registros por solicitud
const ARCHIVO_SALIDA = "personas_desaparecidas_completo.csv";

// 1. Obtención de credenciales desde Variables de Entorno (Enfoque Oficial)
const API_TOKEN = process.env.API_TOKEN;

// Validación estricta de seguridad
if (!API_TOKEN) {
    console.error("❌ ERROR CRÍTICO: No se ha configurado la variable de entorno 'API_TOKEN'.");
    console.log("👉 Por favor, ejecuta el script de esta manera:");
    console.log("   API_TOKEN=\"tu_token_autorizado_aqui\" node descargar_datos_v3.js\n");
    process.exit(1);
}

// Headers de autenticación legítima
const HEADERS_OFICIALES = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${API_TOKEN}` // Inyección segura del token
};

async function obtenerDatos() {
    let page = 1;
    let totalDescargados = 0;
    const todosLosRegistros = [];

    console.log(`\n🚀 Iniciando extracción oficial de datos... (Pidiendo ${PAGE_SIZE} registros por página)\n`);

    while (true) {
        const url = `${BASE_URL}?page=${page}&pageSize=${PAGE_SIZE}`;

        try {
            const respuesta = await fetch(url, {
                method: 'GET',
                headers: HEADERS_OFICIALES
            });

            if (!respuesta.ok) {
                throw new Error(`HTTP ${respuesta.status} - ${respuesta.statusText}`);
            }

            const datosJson = await respuesta.json();
            const items = datosJson.items ? datosJson.items : datosJson;

            if (!items || items.length === 0) {
                console.log("\n✅ ¡No hay más registros! Base de datos descargada en su totalidad.");
                break;
            }

            todosLosRegistros.push(...items);
            totalDescargados += items.length;

            // Imprime el progreso en la misma línea para no saturar la terminal (usando process.stdout)
            process.stdout.write(`\r✅ Progreso: Página ${page} procesada. Total acumulado: ${totalDescargados} personas extraídas.`);

            page++;
            await new Promise(resolve => setTimeout(resolve, 500)); // Pausa de 0.5s para no saturar la API

        } catch (error) {
            console.error(`\n\n⚠️ Error de comunicación en la página ${page}: ${error.message}`);

            // MODO DIAGNÓSTICO: Si falla en la primera petición, generar un CSV con los detalles del error
            if (todosLosRegistros.length === 0) {
                console.log("Generando CSV de diagnóstico oficial con los detalles del error...");
                todosLosRegistros.push({
                    id_diagnostico: "ERROR_API_OFICIAL",
                    estado_http: error.message,
                    endpoint_probado: url,
                    posible_causa: "Token inválido, expirado, o permisos insuficientes en la API.",
                    fecha_intento: new Date().toISOString()
                });
            } else {
                console.log("Guardando los datos descargados de forma segura hasta el punto de interrupción...");
            }
            break;
        }
    }
    console.log("\n"); // Salto de línea al terminar el bucle
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

    console.log(`📁 ¡TAREA FINALIZADA! Archivo generado: '${nombreArchivo}' con ${datos.length} registros en total.`);
}

obtenerDatos().then(datos => guardarEnCSV(datos, ARCHIVO_SALIDA));