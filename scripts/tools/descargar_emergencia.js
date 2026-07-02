const fs = require('fs');

const BASE_URL = "https://desaparecidos-terremoto-api.theempire.tech/api/personas";
const PAGE_SIZE = 100; // Bloques óptimos para no saturar
const ARCHIVO_SALIDA = "personas_desaparecidas_completo.csv";

// 1. INYECTAMOS TU NUEVO TOKEN DE SEGURIDAD RECIÉN CAPTURADO
const HEADERS_HACK = {
    "accept": "*/*",
    "accept-language": "es-419,es;q=0.9,en;q=0.8,fi;q=0.7,en-GB;q=0.6,en-US;q=0.5,es-VE;q=0.4",
    "content-type": "application/json",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Microsoft Edge\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "x-recaptcha-token": "0cAFcWeA7x7b1vz19Yhz4G_WAhvkrdCc4KDKIMGLlz0qMKraK_vTMeeq-4Dit_G6enOndBIyyFYVOHqYZ1I2ajI-_m_2k80WXsyaNuFC58igd4R--hyVjlbGp9J64p60vvjEIpSTIAWtyyFs4NyztLyorUfhqHJHqvRJTEszWytiBZUn1kGhVoxrz9LwS-ZvU00vlOWY1CiMMAueyexjawmVI7F3byTOTpHa1N1LEBM_inmKdNOqOdsV37i-hkK80sQ8fRbJizqRZiE6fP_MM7lB-mNUgzMUZRktd7-l3LVaZxpkYxjMLU8LOV-Y6GyeCU0WIJY7uOIauKa5I9JK_ZRCBLZTGYVrdMa11DqsilO-IzlP2E7q0HavQPrCUBfjC2F7j3A7a7zUJDH-CUeV_y9nIMQMgJknbhNlpSmQBFNgP7Z3JtPu2BRLTpJ96Eu5M8c7-053iz_1pcBZBIA0A8vyMqPh0JGdGRLR4zh_87J0cYLM8C32sIcDA_EUtKopomZjFUSFqSwwJ1HjqxBfj2kicf1Jw0fvqFvyRsUWqMgKqDg7NmnnSR1KfJi7c7gY7OaOKvlJNs9PjGd3vzuoGov8mn-ZU6aq40HiasRdc874Id_FW6wM0MHgDR6Zs7URgQhF2K6ZZm5kaAG5l5JIfDqdEZ-ObewxCbeObCPaVq3fhLZzCnTOyGvZjDAK9Msgn8zV2XfKDMukTsvzwK-k5ewx-dQgxpZo8H7AD7uXSg3fQXGwq5WkkdQphrGJjxSx97XAPulh1uOglDS7-z0OJaVx2UfvY7vn_b54Mub8EKN1EhBIijJzy6Skkyg299Ik1dBkWLzCLo_meQ4OotbjE3xJKrsu_M9quiV6YsA-0LCUifODuJM2lV9RSBZ64MtbNXQkTGWEqTcjq2w176uOjmWWh3NvH5GmKJldqIYZIA9HYiRh0FD-KxIrMFbQnGrL5zJ18yLnA29dBPjJlQLYLGpUwWNaIFANB6bx5veIx8toV8t74NqXxCF3e3tZ1zKxlI9VDkW-yqI_5T8WgAmoOt0tU0rVAGU-ooLGd4KYcm7R1ZY2boOD89lXE0gIIhLDew7nruH0s_wUL9Zxi_YjjO7Ert7SCYo34YtI7tyqCoWimd0gs3q5yBvMKn69bFgkm4mjkF41GrbEEv8MGSvOV7qheUgDb5Ne4hFEAGhS3EtMJF2Ag2noACmw5_Brmj7Esre1Gvlnrv38rcJejohm6XlqQRxlmW9-0FjWAicNddn6jDs_TDGcj_rQQCj9EavYSat6JaDtcF1G2hqT9mbtywsBBGn9wyjGClvQoPiLG213Uy3aLgk4Ikt1Pfs9aM3o7HBBAFzP9NYP4Th1LJ2-WJ9wAJZv_5NPNVcwfpHI4AH4EMlFn_bZAB_KVw27bBz_DVcQrH9eDB9TktDiIEO6Y5uOB0IUzIFeV-PTIbp69xc8mRYKFDO1hv4e6U2H8YYN4YoUpvyayaHGbQZqrqrifWCfrxt8-WNqvT5XdIhepBgRgPkp94LNMjkvCJ_bzeML82eCQRPFgkCunkRbHvE9fgtgOXu7L2u1iZd4RDiwVKT7oDKNNdMUwzlg91mJN0FcLU_egzwht8NFVehyRNWEQrYawcY4I39Y1Zaj223zkGtEfd1I-VF5Gz34oodGzBBe4-yO0oB36Lsca8S7xbysEwatQ4RZRX0yh0PpfWOZgEg4Cstoredf9vfjkt-rpTlJOQ6pgIadNfSiyA6UU3xPXXE1cbD6_zQkxzOqUw9Mh0UY8vomemnOHyMfDtgBlQoMJZEIpCEsvRgt1hq1rVGFKF0DWq8TsSTxTxq2BqCLksPEvx77nCQGfxAI2UoNJ8Tf0_07yT5_n07twIg-CYjlUfiPcVDNlpa15WCg6NUCfjhaTEhDU0F2HFfgpy0x3go8yxtr7KMgdaqjPpZXFv0OWix30GU6VE4tzI6IxpmrXUVB7q-h8wH94qDwwF3_zI-zvKd--bmKgq9Qm55PcpTjRwmX92ROLdL_uEqHCgsM4nwr78yfAClUYZv15obelz99dg7SBg0E+3BVpVRUQSQTG9KOgMbfILMys-zYtv5TOdh-sHFIfsv1T8kIFUPuveO0StjQTAzyU7_zwwXPAUVgTSwP3Sc3fvztIM22JrqUA0VzQFsAakAFrG4HKj4BK7kZXLCu2A-Adwz0ZZ6K38R8ukp_beiO5SP0WA9Lt8w3xPYSfBOieqUu-CFVGgHMRR2HPKfQ2XkmYbZfFrrNXSb5K2RvOBRTnaVeOwv0kEASD107frVHBG07Xi-k96iATSHMl13p-W55_--dql6_dN5wZxcGkNmg8NzAgaFgV_OUdzrnuS8JeOg5eI_jQ4VL9j5OAaKdm8LArKp5E2ao-R4gepfL",
    "Referer": "https://desaparecidosterremotovenezuela.com/"
};

// Convierte un objeto plano a una línea de CSV sanitizada
function convertirAFilaCSV(persona, columnas) {
    return columnas.map(col => {
        let valor = persona[col] !== null && persona[col] !== undefined ? String(persona[col]) : '';
        // Quitar saltos de línea molestos de las descripciones
        valor = valor.replace(/(\r\n|\n|\r)/gm, " ");
        if (valor.includes(',') || valor.includes('"')) {
            valor = `"${valor.replace(/"/g, '""')}"`;
        }
        return valor;
    }).join(',');
}

async function iniciarExtraccion() {
    console.log("=================================================================");
    console.log("🚀 INICIANDO EXTRACCIÓN MAESTRA CON RESISTENCIA A CAÍDAS Y RESUME");
    console.log("=================================================================");

    let pagInicial = 1;
    let existeArchivo = fs.existsSync(ARCHIVO_SALIDA);
    let columnas = [];

    // 2. DETECCIÓN AUTOMÁTICA DE PROGRESO PREVIO
    if (existeArchivo) {
        const contenido = fs.readFileSync(ARCHIVO_SALIDA, 'utf-8');
        const lineas = contenido.trim().split('\n');
        
        if (lineas.length > 1) {
            columnas = lineas[0].split(',');
            // Cada página tiene 100 registros. Estimamos la página en la que nos quedamos.
            const registrosGuardados = lineas.length - 1;
            pagInicial = Math.floor(registrosGuardados / PAGE_SIZE) + 1;
            console.log(`♻️ ¡Progreso detectado! Encontrados ${registrosGuardados} registros en el archivo.`);
            console.log(`👉 Reanudando la descarga automáticamente en la página: ${pagInicial}\n`);
        }
    }

    let page = pagInicial;
    let totalDescargados = existeArchivo ? (page - 1) * PAGE_SIZE : 0;
    let vaciosConsecutivos = 0;

    while (true) {
        // Consultamos la API externa (omitiendo filtros para obtener los 66k registros de una sola vez)
        const url = `${BASE_URL}?page=${page}&pageSize=${PAGE_SIZE}`;
        
        try {
            const respuesta = await fetch(url, {
                method: 'GET',
                headers: HEADERS_HACK
            });

            if (!respuesta.ok) {
                if (respuesta.status === 403 || respuesta.status === 401) {
                    console.log(`\n❌ ERROR DE AUTENTICACIÓN (HTTP ${respuesta.status}): El recaptcha-token ha expirado.`);
                    console.log("👉 Por favor, recarga la página, captura un nuevo token de red y actualízalo en el script.");
                    break;
                }
                throw new Error(`HTTP ${respuesta.status}`);
            }

            const datosJson = await respuesta.json();
            const items = datosJson.items ? datosJson.items : datosJson;

            if (!items || items.length === 0) {
                vaciosConsecutivos++;
                if (vaciosConsecutivos >= 3) {
                    console.log("\n\n✅ ¡Misión cumplida! Hemos llegado al final absoluto de la base de datos.");
                    break;
                }
                page++;
                continue;
            }
            vaciosConsecutivos = 0;

            // 3. GENERACIÓN DINÁMICA DE CABECERA (Solo en la primera ejecución del archivo)
            if (columnas.length === 0) {
                columnas = Object.keys(items[0]);
                fs.writeFileSync(ARCHIVO_SALIDA, columnas.join(',') + '\n', 'utf-8');
            }

            // 4. ESCRITURA EN CALIENTE (Evitamos colapsar la memoria RAM)
            const bloqueFilas = items.map(p => convertirAFilaCSV(p, columnas)).join('\n') + '\n';
            fs.appendFileSync(ARCHIVO_SALIDA, bloqueFilas, 'utf-8');

            totalDescargados += items.length;
            process.stdout.write(`\r📥 Descargando: Página ${page} procesada. Total acumulado: ${totalDescargados} / ~66,940 personas.`);

            page++;
            // Pausa de 400ms para evadir de forma segura los límites de velocidad del firewall (Rate Limiting)
            await new Promise(r => setTimeout(r, 400));

        } catch (error) {
            console.log(`\n\n⚠️ Error en la página ${page}: ${error.message}`);
            console.log("💾 Tu progreso ha sido guardado de forma segura en disco.");
            console.log("👉 Simplemente vuelve a ejecutar el comando y el script continuará donde se detuvo.");
            break;
        }
    }
}

iniciarExtraccion();