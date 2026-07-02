const fs = require('fs');

const ARCHIVO_ENTRADA = 'base_maestra_completa_venezuela.csv';
const INCIDENT_ID = '9e730f8c-d800-4cf0-b9f1-54eac120a6bf';
const FILAS_POR_LOTE = 3000;
const REGISTROS_POR_INSERT = 500;

const PALABRAS_NEGRAS = [
  'elver galarga',
  'rosa melano',
  'benito camelas',
  'debora melo',
  'lomas turbas',
  'paco gerte',
  'aquiles castro',
  'elmer curio',
  'aitor tilla',
  'test',
  'prueba',
  'troll',
  'asdf',
  'qwerty',
];

function escapeSql(value) {
  if (value === null || value === undefined) return 'NULL';
  const clean = String(value).trim().replace(/'/g, "''");
  if (!clean) return 'NULL';
  return `'${clean}'`;
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/\r\n|\r|\n/g, ' - ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapStatus(status, hospitalStatus) {
  const source = `${status || ''} ${hospitalStatus || ''}`.toLowerCase();

  if (
    source.includes('deceased') ||
    source.includes('fallecido') ||
    source.includes('muerto')
  ) {
    return 'fallecido';
  }

  if (
    source.includes('found') ||
    source.includes('a_salvo') ||
    source.includes('safe') ||
    source.includes('encontrado')
  ) {
    return 'a_salvo';
  }

  if (
    source.includes('hospital') ||
    source.includes('injured') ||
    source.includes('herido') ||
    source.includes('critical')
  ) {
    return 'herido';
  }

  return 'buscado';
}

function parseReporter(reporterRaw) {
  const text = normalizeText(reporterRaw);
  if (!text) return 'No especificado';

  try {
    const obj = JSON.parse(text);
    const parts = [];
    if (obj.name) parts.push(normalizeText(obj.name));
    if (obj.phone) parts.push(`Tel: ${normalizeText(obj.phone)}`);
    if (obj.email) parts.push(`Email: ${normalizeText(obj.email)}`);
    return parts.length ? parts.join(' - ') : 'No especificado';
  } catch {
    return text.replace(/^"|"$/g, '') || 'No especificado';
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cell);
      cell = '';
      if (row.some((c) => c !== '')) rows.push(row);
      row = [];
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((c) => c !== '')) rows.push(row);
  }

  return rows;
}

function pick(row, idx) {
  if (idx < 0 || idx >= row.length) return '';
  return row[idx];
}

function isGarbageName(name) {
  const lower = name.toLowerCase();

  if (!name || name.length < 3 || name.length > 90) return true;
  if (
    lower.includes('{') ||
    lower.includes('[') ||
    lower.includes('"phone"') ||
    lower.includes('"email"') ||
    lower.includes('"source"') ||
    lower.includes('createdat') ||
    lower.includes('updatedat')
  ) {
    return true;
  }

  return PALABRAS_NEGRAS.some((bad) => lower.includes(bad));
}

function generarLoteSql(loteRecords, numeroLote, totalLotes, desde, hasta) {
  const lines = [];
  lines.push('-- ===============================================================');
  lines.push(`-- LOTE ${numeroLote} de ${totalLotes}`);
  lines.push(`-- Registros: ${desde} a ${hasta}`);
  lines.push('-- ===============================================================');
  lines.push('BEGIN;');
  lines.push('');

  for (let i = 0; i < loteRecords.length; i += REGISTROS_POR_INSERT) {
    const chunk = loteRecords.slice(i, i + REGISTROS_POR_INSERT);

    lines.push(
      'INSERT INTO persons (incident_id, name_desc, document_id, status, location_text, reporter_contact, trust_level) VALUES'
    );

    const values = chunk.map((r, idx) => {
      const suffix = idx === chunk.length - 1 ? ';' : ',';
      return `(${escapeSql(INCIDENT_ID)}, ${escapeSql(r.name)}, ${escapeSql(r.documentId)}, ${escapeSql(r.status)}, ${escapeSql(r.location)}, ${escapeSql(r.reporter)}, 0)${suffix}`;
    });

    lines.push(values.join('\n'));
    lines.push('');
  }

  lines.push('COMMIT;');
  lines.push('');
  return lines.join('\n');
}

function procesarMaestro() {
  console.log('===============================================================');
  console.log('INICIANDO PROCESAMIENTO MAESTRO A LOTES SQL');
  console.log('===============================================================');

  if (!fs.existsSync(ARCHIVO_ENTRADA)) {
    console.error(`ERROR: no existe ${ARCHIVO_ENTRADA}`);
    process.exit(1);
  }

  const contenido = fs.readFileSync(ARCHIVO_ENTRADA, 'utf8');
  const rows = parseCsv(contenido);

  if (rows.length < 2) {
    console.error('ERROR: el CSV no tiene filas suficientes.');
    process.exit(1);
  }

  const headers = rows[0];
  const idxId = headers.indexOf('id');
  const idxFirstName = headers.indexOf('firstName');
  const idxLastName = headers.indexOf('lastName');
  const idxIdNumber =
    headers.indexOf('idNumber') !== -1 ? headers.indexOf('idNumber') : headers.indexOf('cedula');
  const idxStatus = headers.indexOf('status');
  const idxHospitalStatus = headers.indexOf('hospitalStatus');
  const idxLastSeen = headers.indexOf('lastSeen');
  const idxDescription = headers.indexOf('description');
  const idxHospitalName = headers.indexOf('hospitalName');
  const idxReporter = headers.indexOf('reporter');

  const records = [];
  const idsUnicos = new Set();
  const clavesUnicas = new Set();

  let descartados = 0;
  let descartadosNombre = 0;
  let descartadosDuplicado = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];

    const id = normalizeText(pick(row, idxId));
    const firstName = normalizeText(pick(row, idxFirstName));
    const lastName = normalizeText(pick(row, idxLastName));
    const fullName = normalizeText(`${firstName} ${lastName}`);

    if (isGarbageName(fullName)) {
      descartados += 1;
      descartadosNombre += 1;
      continue;
    }

    const documentId = normalizeText(pick(row, idxIdNumber)) || null;
    const status = mapStatus(pick(row, idxStatus), pick(row, idxHospitalStatus));

    let location =
      normalizeText(pick(row, idxLastSeen)) ||
      normalizeText(pick(row, idxDescription)) ||
      normalizeText(pick(row, idxHospitalName)) ||
      'No especificada';

    if (!location) location = 'No especificada';
    const reporter = parseReporter(pick(row, idxReporter));

    if (id) {
      if (idsUnicos.has(id)) {
        descartados += 1;
        descartadosDuplicado += 1;
        continue;
      }
      idsUnicos.add(id);
    } else {
      const clave = `${fullName.toLowerCase()}|${(documentId || '').toLowerCase()}|${status}|${location.toLowerCase()}`;
      if (clavesUnicas.has(clave)) {
        descartados += 1;
        descartadosDuplicado += 1;
        continue;
      }
      clavesUnicas.add(clave);
    }

    records.push({
      name: fullName,
      documentId,
      status,
      location,
      reporter,
    });
  }

  const totalValidos = records.length;
  const totalLotes = Math.ceil(totalValidos / FILAS_POR_LOTE);

  for (let i = 1; i <= 50; i += 1) {
    const file = `lote_maestro_${i}.sql`;
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  for (let lote = 0; lote < totalLotes; lote += 1) {
    const inicio = lote * FILAS_POR_LOTE;
    const finExclusivo = Math.min(inicio + FILAS_POR_LOTE, totalValidos);
    const loteRecords = records.slice(inicio, finExclusivo);

    const contenidoLote = generarLoteSql(
      loteRecords,
      lote + 1,
      totalLotes,
      inicio + 1,
      finExclusivo
    );

    const nombreArchivo = `lote_maestro_${lote + 1}.sql`;
    fs.writeFileSync(nombreArchivo, contenidoLote, 'utf8');
  }

  console.log('');
  console.log('Resumen de procesamiento:');
  console.log(`- Filas CSV totales (sin cabecera): ${rows.length - 1}`);
  console.log(`- Registros validos: ${totalValidos}`);
  console.log(`- Registros descartados: ${descartados}`);
  console.log(`- Descartados por nombre invalido/troll: ${descartadosNombre}`);
  console.log(`- Descartados por duplicado: ${descartadosDuplicado}`);
  console.log(`- Lotes SQL generados: ${totalLotes}`);
  console.log(`- Tamano por lote objetivo: ${FILAS_POR_LOTE}`);
  console.log('');
  console.log('Archivos listos: lote_maestro_1.sql ... lote_maestro_' + totalLotes + '.sql');
}

procesarMaestro();
