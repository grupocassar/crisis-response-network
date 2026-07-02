const fs = require('fs');

const ARCHIVO_ORIGINAL = 'francotirador_exitos.sql';
const LINEAS_POR_ARCHIVO = 3000; // Pedazos de 3000 líneas (Seguro para Supabase)

function dividirArchivo() {
    console.log("✂️ Cortando el archivo SQL gigante en pedazos digeribles...");

    if (!fs.existsSync(ARCHIVO_ORIGINAL)) {
        console.error(`❌ No se encuentra el archivo ${ARCHIVO_ORIGINAL}`);
        return;
    }

    const contenido = fs.readFileSync(ARCHIVO_ORIGINAL, 'utf-8');
    const lineas = contenido.split('\n');

    let parte = 1;
    let lineasActuales = [];

    for (let i = 0; i < lineas.length; i++) {
        // Ignoramos líneas vacías para no hacer bulto
        if (lineas[i].trim() !== '') {
            lineasActuales.push(lineas[i]);
        }

        // Cuando llegamos a 3000 líneas, o al final del archivo, guardamos
        if (lineasActuales.length >= LINEAS_POR_ARCHIVO || i === lineas.length - 1) {
            const nombreArchivo = `francotirador_parte_${parte}.sql`;
            fs.writeFileSync(nombreArchivo, lineasActuales.join('\n'));
            console.log(`✅ Creado: ${nombreArchivo} (con ${lineasActuales.length} actualizaciones)`);
            parte++;
            lineasActuales = [];
        }
    }

    console.log("\n🚀 ¡División completada con éxito!");
    console.log("👉 Ahora ve a Supabase y ejecuta estos archivos uno por uno.");
}

dividirArchivo();
