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

  console.log('🔌 Proyecto: ' + PROJECT_REF);
  console.log('📄 Archivo:  ' + SQL_FILE);
  console.log('─────────────────────────────────────');

  const res = await fetch(
    'https://api.supabase.com/v1/projects/' + PROJECT_REF + '/database/query',
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + ACCESS_TOKEN,
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
  console.log('✅ SQL ejecutado correctamente. (' + rows + ' filas)');
  console.log('─────────────────────────────────────');
  console.log('🟢 Listo.');
}

ejecutar().catch(err => {
  console.error('❌ Excepción:', err.message);
  process.exit(1);
});
