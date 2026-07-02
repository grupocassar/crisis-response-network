// scripts/validar_ingesta.js
// Ejecutar: node scripts/validar_ingesta.js <archivo.csv>
// Valida un CSV antes de insertar en persons.
// Genera reporte en /tmp/validacion_TIMESTAMP.json
// No inserta nada — solo reporta.

require('dotenv').config();
const fs   = require('fs');
const path = require('path');

const ARCHIVO = process.argv[2];
if (!ARCHIVO) {
  console.error('Uso: node scripts/validar_ingesta.js <archivo.csv>');
  process.exit(1);
}

const PROJECT = process.env.SUPABASE_PROJECT_REF;
const TOKEN   = process.env.SUPABASE_ACCESS_TOKEN;
const STATUS_VALIDOS = ['buscado','a_salvo','herido','fallecido'];

async function query(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    }
  );
  return res.json();
}

function parsearCSV(contenido) {
  const lineas = contenido.trim().split('\n');
  const headers = lineas[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));
  return lineas.slice(1).map(linea => {
    const vals = linea.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] || '').trim().replace(/^"|"$/g,'');
    });
    return obj;
  });
}

async function validar() {
  console.log(`\n[VALIDADOR] Leyendo: ${ARCHIVO}`);
  const contenido = fs.readFileSync(ARCHIVO, 'utf8');
  const registros = parsearCSV(contenido);
  console.log(`[VALIDADOR] Registros en CSV: ${registros.length}`);

  const errores   = [];
  const warnings  = [];
  const cedulas   = new Map();

  // --- REGLAS DE VALIDACION LOCAL ---
  for (let i = 0; i < registros.length; i++) {
    const r   = registros[i];
    const fila = i + 2; // +2 por header y base 0

    // R1: name_desc obligatorio y >= 3 chars
    if (!r.name_desc || r.name_desc.trim().length < 3) {
      errores.push({ fila, campo: 'name_desc', valor: r.name_desc,
        regla: 'R1', detalle: 'name_desc vacío o menor a 3 caracteres' });
    }

    // R2: status debe ser uno de los 4 válidos
    if (!STATUS_VALIDOS.includes(r.status)) {
      errores.push({ fila, campo: 'status', valor: r.status,
        regla: 'R2', detalle: `status inválido. Valores permitidos: ${STATUS_VALIDOS.join(', ')}` });
    }

    // R3: fallecido requiere location_text no vacío
    if (r.status === 'fallecido' && (!r.location_text || r.location_text.trim() === '')) {
      errores.push({ fila, campo: 'location_text', valor: '',
        regla: 'R3', detalle: 'fallecido sin location_text — no permitido' });
    }

    // R4: document_id no puede ser placeholder conocido
    const PLACEHOLDERS = ['0','00','000','0000','00000','000000','0000000',
      '00000000','000000000','11111111','12345678','99999999'];
    if (r.document_id && PLACEHOLDERS.includes(r.document_id.trim())) {
      warnings.push({ fila, campo: 'document_id', valor: r.document_id,
        regla: 'R4', detalle: 'document_id es un placeholder conocido — se cargará como NULL' });
      r.document_id = '';
    }

    // R5: document_id no puede ser UUID
    if (r.document_id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.document_id.trim())) {
      warnings.push({ fila, campo: 'document_id', valor: r.document_id,
        regla: 'R5', detalle: 'document_id es UUID interno — se cargará como NULL' });
      r.document_id = '';
    }

    // R6: document_id no puede ser número de 5 dígitos o menos
    if (r.document_id && /^[0-9]{1,5}$/.test(r.document_id.trim())) {
      warnings.push({ fila, campo: 'document_id', valor: r.document_id,
        regla: 'R6', detalle: 'document_id demasiado corto para ser cédula venezolana — se cargará como NULL' });
      r.document_id = '';
    }

    // R7: encoding roto en name_desc
    if (r.name_desc && /[ÃâÂ\x80-\x9f]/.test(r.name_desc) &&
        !/ã|â|à|á|ä/.test(r.name_desc.toLowerCase())) {
      warnings.push({ fila, campo: 'name_desc', valor: r.name_desc,
        regla: 'R7', detalle: 'posible encoding roto en name_desc — verificar' });
    }

    // R8: duplicados de document_id dentro del mismo CSV
    if (r.document_id && r.document_id.trim() !== '') {
      const ced = r.document_id.trim();
      if (cedulas.has(ced)) {
        warnings.push({ fila, campo: 'document_id', valor: ced,
          regla: 'R8',
          detalle: `document_id duplicado dentro del CSV — primera aparición en fila ${cedulas.get(ced)}` });
      } else {
        cedulas.set(ced, fila);
      }
    }
  }

  // --- VALIDACION CONTRA BASE EXISTENTE ---
  console.log('[VALIDADOR] Cruzando document_ids contra base existente...');
  const cedsConValor = [...cedulas.keys()].filter(c => c !== '');

  let conflictosDB = 0;
  if (cedsConValor.length > 0) {
    // Procesar en lotes de 100 para no exceder límite de query
    for (let i = 0; i < cedsConValor.length; i += 100) {
      const lote = cedsConValor.slice(i, i + 100);
      const lista = lote.map(c => `'${c.replace(/'/g,"''")}'`).join(',');
      const rows = await query(
        `SELECT document_id, status, name_desc FROM persons
         WHERE document_id IN (${lista}) LIMIT 200;`
      );
      if (Array.isArray(rows)) {
        for (const row of rows) {
          warnings.push({
            fila: 'N/A',
            campo: 'document_id',
            valor: row.document_id,
            regla: 'R9',
            detalle: `document_id ya existe en base con status="${row.status}" name="${row.name_desc}" — posible duplicado`
          });
          conflictosDB++;
        }
      }
    }
  }

  // --- REPORTE ---
  const reporte = {
    archivo: path.basename(ARCHIVO),
    fecha: new Date().toISOString(),
    total_registros_csv: registros.length,
    errores_bloqueantes: errores.length,
    warnings: warnings.length,
    conflictos_con_base: conflictosDB,
    decision: errores.length === 0 ? 'APROBADO_CON_WARNINGS' : 'BLOQUEADO',
    detalle_errores: errores,
    detalle_warnings: warnings.slice(0, 50),
    nota: warnings.length > 50
      ? `Solo se muestran los primeros 50 warnings. Total: ${warnings.length}`
      : null
  };

  const rutaReporte = `/tmp/validacion_${Date.now()}.json`;
  fs.writeFileSync(rutaReporte, JSON.stringify(reporte, null, 2));

  console.log('\n══════════════════════════════════════');
  console.log('RESULTADO DE VALIDACIÓN');
  console.log('══════════════════════════════════════');
  console.log(`Registros en CSV:        ${registros.length}`);
  console.log(`Errores bloqueantes:     ${errores.length}`);
  console.log(`Warnings:                ${warnings.length}`);
  console.log(`Conflictos con base:     ${conflictosDB}`);
  console.log(`Decisión:                ${reporte.decision}`);
  console.log(`Reporte guardado en:     ${rutaReporte}`);
  console.log('══════════════════════════════════════\n');

  if (errores.length > 0) {
    console.log('ERRORES BLOQUEANTES:');
    errores.forEach(e =>
      console.log(`  Fila ${e.fila} [${e.regla}] ${e.campo}="${e.valor}" → ${e.detalle}`)
    );
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log('WARNINGS (no bloquean pero revisar):');
    warnings.slice(0, 10).forEach(w =>
      console.log(`  Fila ${w.fila} [${w.regla}] ${w.campo}="${w.valor}" → ${w.detalle}`)
    );
    if (warnings.length > 10)
      console.log(`  ... y ${warnings.length - 10} warnings más en el reporte.`);
  }

  process.exit(0);
}

validar().catch(err => {
  console.error('[VALIDADOR] Error fatal:', err.message);
  process.exit(1);
});
