const fs = require('fs');
const path = require('path');

const DEFAULT_URL_PREFIX =
  'https://venezuelatebusca.com/_root.data?_routes=routes%2F_index&page=';

const OUTPUT_MISSING = 'personas_desaparecidas.csv';
const OUTPUT_NOT_MISSING = 'personas_no_desaparecidas.csv';
const OUTPUT_UNKNOWN = 'personas_no_clasificadas.csv';
const OUTPUT_SUMMARY = 'resumen_personas.json';

const MISSING_TERMS = [
  'desaparecid',
  'missing',
  'no ubicado',
  'no localizado',
  'en busqueda',
  'en búsqueda',
  'buscado'
];

const NOT_MISSING_TERMS = [
  'no desaparecido',
  'localizado',
  'ubicado',
  'encontrado',
  'a salvo',
  'safe',
  'alive',
  'rescatado',
  'fallecido',
  'deceased',
  'hospitalizado',
  'reunido'
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function valueLooksTruthy(value) {
  if (typeof value === 'boolean') return value;
  const text = normalizeText(value);
  return ['1', 'true', 'si', 'yes', 'y', 't'].includes(text);
}

function valueLooksFalsy(value) {
  if (typeof value === 'boolean') return !value;
  const text = normalizeText(value);
  return ['0', 'false', 'no', 'n', 'f'].includes(text);
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function findCandidateArrays(node, found = []) {
  if (Array.isArray(node)) {
    if (node.length > 0 && node.every((item) => isObject(item))) {
      found.push(node);
    }
    return found;
  }

  if (!isObject(node)) {
    return found;
  }

  for (const key of Object.keys(node)) {
    findCandidateArrays(node[key], found);
  }

  return found;
}

function scoreRecordArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;

  const priorityKeys = [
    'name',
    'nombre',
    'full_name',
    'status',
    'estado',
    'missing',
    'desaparecido',
    'condition'
  ];

  const sample = arr.slice(0, Math.min(arr.length, 30));
  let score = arr.length;

  for (const row of sample) {
    for (const key of Object.keys(row)) {
      const k = normalizeText(key);
      if (priorityKeys.some((pk) => k.includes(pk))) score += 3;
    }
  }

  return score;
}

function findBestRecordsArray(payload) {
  const arrays = findCandidateArrays(payload);
  if (arrays.length === 0) return [];
  arrays.sort((a, b) => scoreRecordArray(b) - scoreRecordArray(a));
  return arrays[0];
}

function detectByBooleanKey(record) {
  const keys = Object.keys(record);
  for (const key of keys) {
    const normalizedKey = normalizeText(key);
    const value = record[key];

    if (
      normalizedKey.includes('missing') ||
      normalizedKey.includes('desaparecid') ||
      normalizedKey === 'is_missing'
    ) {
      if (valueLooksTruthy(value)) return 'desaparecido';
      if (valueLooksFalsy(value)) return 'no_desaparecido';
    }
  }

  return null;
}

function detectByStatusText(record) {
  const keys = Object.keys(record);
  const statusKeys = [
    'status',
    'estado',
    'condition',
    'situacion',
    'situation',
    'hospital',
    'categoria',
    'category'
  ];

  const chunks = [];
  for (const key of keys) {
    const normalizedKey = normalizeText(key);
    if (statusKeys.some((token) => normalizedKey.includes(token))) {
      chunks.push(normalizeText(record[key]));
    }
  }

  if (chunks.length === 0) {
    chunks.push(normalizeText(JSON.stringify(record)));
  }

  const text = chunks.join(' | ');
  if (MISSING_TERMS.some((term) => text.includes(term))) return 'desaparecido';
  if (NOT_MISSING_TERMS.some((term) => text.includes(term))) return 'no_desaparecido';
  return 'desconocido';
}

function classifyRecord(record) {
  const booleanResult = detectByBooleanKey(record);
  if (booleanResult) return booleanResult;
  return detectByStatusText(record);
}

function csvEscape(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  if (raw.includes(',') || raw.includes('"') || raw.includes('\n')) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function writeCsv(fileName, rows) {
  if (!rows || rows.length === 0) {
    fs.writeFileSync(fileName, 'sin_datos\n', 'utf8');
    return;
  }

  const headersSet = new Set();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => headersSet.add(key));
  });

  const headers = Array.from(headersSet);
  const headerLine = headers.map(csvEscape).join(',');
  const dataLines = rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','));
  fs.writeFileSync(fileName, `${headerLine}\n${dataLines.join('\n')}\n`, 'utf8');
}

async function fetchPage(page, urlPrefix, cookieHeader) {
  const headers = {
    accept: 'application/json,text/plain,*/*',
    'user-agent': 'Mozilla/5.0 (compatible; crisis-response-bot/1.0)'
  };

  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const url = `${urlPrefix}${page}`;
  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    const body = await response.text();
    const preview = body.slice(0, 180).replace(/\s+/g, ' ').trim();
    throw new Error(`HTTP ${response.status} ${response.statusText} en ${url} :: ${preview}`);
  }

  return response.json();
}

function loadRecordsFromJsonFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed) && parsed.every((item) => isObject(item))) {
    return parsed;
  }

  return findBestRecordsArray(parsed);
}

function parseCsv(content) {
  const rows = [];
  let current = '';
  let row = [];
  let inQuotes = false;

  const pushCell = () => {
    row.push(current);
    current = '';
  };

  const pushRow = () => {
    if (row.length === 1 && row[0] === '') {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      pushCell();
      continue;
    }

    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i += 1;
      pushCell();
      pushRow();
      continue;
    }

    current += ch;
  }

  pushCell();
  pushRow();

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj = {};
    for (let i = 0; i < headers.length; i += 1) {
      obj[headers[i] || `col_${i + 1}`] = cells[i] ?? '';
    }
    return obj;
  });
}

function loadRecordsFromSourceFile(filePath) {
  const absolutePath = path.resolve(filePath);
  const ext = path.extname(absolutePath).toLowerCase();

  if (ext === '.csv') {
    const raw = fs.readFileSync(absolutePath, 'utf8');
    return parseCsv(raw);
  }

  return loadRecordsFromJsonFile(absolutePath);
}

async function loadRecords() {
  const sourceFile = process.env.SOURCE_FILE;
  if (sourceFile) {
    const rows = loadRecordsFromSourceFile(sourceFile);
    if (!rows || rows.length === 0) {
      throw new Error(`SOURCE_FILE no contiene arreglos de registros útiles: ${sourceFile}`);
    }
    console.log(`Usando SOURCE_FILE: ${sourceFile}. Registros detectados: ${rows.length}`);
    return rows;
  }

  const urlPrefix = process.env.VTB_URL_PREFIX || DEFAULT_URL_PREFIX;
  const cookie = process.env.VTB_COOKIE || '';
  const maxPages = Number(process.env.MAX_PAGES || 120);

  let page = 1;
  const records = [];

  while (page <= maxPages) {
    let payload;

    try {
      payload = await fetchPage(page, urlPrefix, cookie);
    } catch (error) {
      if (page === 1 && !process.env.SOURCE_FILE) {
        throw new Error(
          [
            'No se pudo leer la fuente remota en la primera página.',
            error.message,
            'Si Cloudflare bloquea este entorno, exporta un JSON desde tu navegador local y ejecuta:',
            'SOURCE_FILE=./datos_venezuela.json node descargar_fallecidos.js'
          ].join('\n')
        );
      }
      console.log(`Corte por error en página ${page}: ${error.message}`);
      break;
    }

    const items = findBestRecordsArray(payload);
    if (!items || items.length === 0) {
      console.log(`Sin datos útiles en página ${page}. Fin de extracción.`);
      break;
    }

    records.push(...items);
    process.stdout.write(`\rProgreso: página ${page}, total ${records.length} registros...`);
    page += 1;
  }

  process.stdout.write('\n');
  return records;
}

function buildSummary(disappeared, notDisappeared, unknown, total) {
  return {
    timestamp: new Date().toISOString(),
    total_registros: total,
    desaparecidos: disappeared.length,
    no_desaparecidos: notDisappeared.length,
    no_clasificados: unknown.length,
    archivos: {
      desaparecidos: OUTPUT_MISSING,
      no_desaparecidos: OUTPUT_NOT_MISSING,
      no_clasificados: OUTPUT_UNKNOWN
    }
  };
}

async function main() {
  try {
    const rows = await loadRecords();
    if (!rows || rows.length === 0) {
      console.log('No se obtuvieron registros procesables.');
      process.exit(1);
    }

    const disappeared = [];
    const notDisappeared = [];
    const unknown = [];

    for (const row of rows) {
      const result = classifyRecord(row);
      if (result === 'desaparecido') {
        disappeared.push(row);
      } else if (result === 'no_desaparecido') {
        notDisappeared.push(row);
      } else {
        unknown.push(row);
      }
    }

    writeCsv(OUTPUT_MISSING, disappeared);
    writeCsv(OUTPUT_NOT_MISSING, notDisappeared);
    writeCsv(OUTPUT_UNKNOWN, unknown);

    const summary = buildSummary(disappeared, notDisappeared, unknown, rows.length);
    fs.writeFileSync(OUTPUT_SUMMARY, JSON.stringify(summary, null, 2), 'utf8');

    console.log('Extracción y clasificación finalizadas.');
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error('Fallo crítico:', error.message);
    process.exit(1);
  }
}

main();