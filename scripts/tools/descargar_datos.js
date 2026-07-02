const fs = require('fs');

const BASE_URL = "https://desaparecidos-terremoto-api.theempire.tech/api/personas";
const PAGE_SIZE = 100;
const ARCHIVO_SALIDA = "personas_desaparecidas_completo.csv";

async function obtenerDatos() {
    let page = 1;
    let totalDescargados = 0;
    const todosLosRegistros = [];

    console.log(`\n🚀 Iniciando descarga desde la API... (Pidiendo ${PAGE_SIZE} registros por página)\n`);

    while (true) {
        const url = `${BASE_URL}?page=${page}&pageSize=${PAGE_SIZE}`;

        try {
            const respuesta = await fetch(url);

            if (!respuesta.ok) {
                throw new Error(`Error del servidor: ${respuesta.status}`);
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
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`\n⚠️ Ocurrió un error en la página ${page}: ${error.message}`);
            console.log("Guardando los datos descargados hasta el momento...");
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

    console.log(`\n📁 ¡ÉXITO! Archivo guardado en tu proyecto como: '${nombreArchivo}'`);
}

obtenerDatos().then(datos => guardarEnCSV(datos, ARCHIVO_SALIDA));