#!/usr/bin/env node
// =====================================================================
// conectar_db.js — Prueba de conexión a Supabase vía REST API
// Uso: node scripts/conectar_db.js
// =====================================================================
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const INCIDENT_ID = process.env.INCIDENT_ID;

const key = SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY !== 'tu_service_role_key_aqui'
  ? SUPABASE_SERVICE_ROLE_KEY
  : SUPABASE_ANON_KEY;

const tipoKey = SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY !== 'tu_service_role_key_aqui'
  ? 'service_role' : 'anon';

async function main() {
  console.log('=====================================================================');
  console.log('  VERIFICACIÓN DE CONEXIÓN — Crisis Response Network');
  console.log('=====================================================================');
  console.log(`  URL:       ${SUPABASE_URL}`);
  console.log(`  Key tipo:  ${tipoKey}`);
  console.log(`  Incidente: ${INCIDENT_ID}`);
  console.log('─────────────────────────────────────────────────────────────────────');

  try {
    // 1. Ping al incidente principal
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/incidents?slug=eq.terremoto-ve-2026&select=id,slug,created_at`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    const data = await res.json();
    if (!res.ok || !data.length) throw new Error(`Respuesta inesperada: ${JSON.stringify(data)}`);
    console.log('✅ Incidente encontrado:', data[0]);

    // 2. Contar personas
    const res2 = await fetch(
      `${SUPABASE_URL}/rest/v1/persons?incident_id=eq.${INCIDENT_ID}&select=id`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact', Range: '0-0' } }
    );
    const total = res2.headers.get('content-range')?.split('/')[1] ?? '?';
    console.log(`✅ Personas en BD: ${total}`);

    // 3. Stats
    const res3 = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_incident_stats`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_incident_id: INCIDENT_ID })
    });
    const stats = await res3.json();
    console.log('✅ Stats actuales:', stats);

    console.log('─────────────────────────────────────────────────────────────────────');
    console.log('🟢 Conexión exitosa. El entorno está listo.');
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    process.exit(1);
  }
}

main();
