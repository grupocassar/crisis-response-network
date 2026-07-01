#!/usr/bin/env node
// =====================================================================
// ejecutar_sql.js — Ejecuta un .sql contra Supabase vía Management API
// Requiere SUPABASE_ACCESS_TOKEN con formato sbp_xxx (Personal Access Token)
// Obtener en: https://supabase.com/dashboard/account/tokens
// Uso: node scripts/ejecutar_sql.js ruta/al/archivo.sql
// =====================================================================
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF  = process.env.SUPABASE_PROJECT_REF;
const SQL_FILE     = process.argv[2];

if (!SQL_FILE || !fs.existsSync(SQL_FILE)) {
  console.error('❌ Archivo SQL no encontrado:', SQL_FILE);
  process.exit(1);
}

if (!ACCESS_TOKEN || !ACCESS_TOKEN.startsWith('sbp_')) {
  console.error('❌ SUPABASE_ACCESS_TOKEN inválido.');
  console.error('   Debe empezar con "sbp_".');
  console.error('   Crear en: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

async function ejecutar() {
  const sql = fs.readFileSync(SQL_FILE, 'utf-8');

  console.log(`🔌 Proyecto: ${PROJECT_REF}`);
  console.log(`📄 Archivo:  ${SQL_FILE}`);
  console.log('─────────────────────────────────────');

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql })
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error('❌ Error:', data?.message || JSON.stringify(data));
    process.exit(1);
  }

  const rows = Array.isArray(data) ? data.length : (data.rowCount ?? '?');
  console.log(`✅ SQL ejecutado correctamente. (${rows} filas)`);
  console.log('─────────────────────────────────────');
  console.log('🟢 Listo.');
}

ejecutar().catch(err => {
  console.error('❌ Excepción:', err.message);
  process.exit(1);
});


const SQL_FILE = process.argv[2];

if (!SQL_FILE || !fs.existsSync(SQL_FILE)) {
  console.error('❌ Archivo SQL no encontrado:', SQL_FILE);
  process.exit(1);
}

async function ejecutar() {
  const client = new Client({
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl:      { rejectUnauthorized: false }
  });

  console.log(`🔌 Conectando a ${process.env.DB_HOST}...`);
  console.log(`📄 Archivo: ${SQL_FILE}`);
  console.log('─────────────────────────────────────');

  await client.connect();
  const sql = fs.readFileSync(SQL_FILE, 'utf-8');

  try {
    const result = await client.query(sql);
    const rows = Array.isArray(result) ? result.length : (result.rowCount ?? '?');
    console.log(`✅ SQL ejecutado correctamente. (${rows} filas afectadas)`);
  } finally {
    await client.end();
  }

  console.log('─────────────────────────────────────');
  console.log('🟢 Listo.');
}

ejecutar().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});


if (!SQL_FILE || !fs.existsSync(SQL_FILE)) {
  console.error('❌ Archivo SQL no encontrado:', SQL_FILE);
  process.exit(1);
}

if (!ACCESS_TOKEN || ACCESS_TOKEN === 'tu_access_token_aqui') {
  console.error('❌ Falta SUPABASE_ACCESS_TOKEN en .env');
  process.exit(1);
}

async function ejecutar() {
  const sql = fs.readFileSync(SQL_FILE, 'utf-8');

  // Partir el SQL en statements individuales (por si tiene múltiples)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`🔌 Proyecto: ${PROJECT_REF}`);
  console.log(`📄 Archivo:  ${SQL_FILE}`);
  console.log(`📊 Statements: ${statements.length}`);
  console.log('─────────────────────────────────────');

  let ok = 0;
  let err = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: stmt + ';' })
        }
      );
      const data = await res.json();
      if (!res.ok) {
        console.error(`  ❌ [${i+1}/${statements.length}] Error:`, data?.message || JSON.stringify(data));
        err++;
      } else {
        const rows = Array.isArray(data) ? data.length : '?';
        console.log(`  ✅ [${i+1}/${statements.length}] OK (${rows} filas afectadas)`);
        ok++;
      }
    } catch (e) {
      console.error(`  ❌ [${i+1}/${statements.length}] Excepción:`, e.message);
      err++;
    }
  }

  console.log('─────────────────────────────────────');
  console.log(`✅ ${ok} OK  |  ❌ ${err} errores`);
  if (err > 0) process.exit(1);
}

ejecutar();
