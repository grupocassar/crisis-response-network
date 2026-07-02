const fs = require('fs');

// Buscar el archivo delta más reciente
const archivos = fs.readdirSync(__dirname);
const archivo = archivos.find(f => f.startsWith('rescate_delta_fresco_') && f.endsWith('.csv'));

if(archivo) {
    console.log("=================================================");
    console.log(`🔍 ANALIZANDO EL ARCHIVO: ${archivo}`);
    console.log("=================================================\n");
    
    const data = fs.readFileSync(archivo, 'utf8').split('\n');
    
    console.log("👉 LAS CABECERAS EXACTAS DEL ARCHIVO SON:");
    console.log(data[0]);
    
    console.log("\n👉 LA PRIMERA FILA DE DATOS ES:");
    console.log(data[1]);
    console.log("\n=================================================");
} else {
    console.log("❌ No se encontró ningún archivo delta en la carpeta.");
}
