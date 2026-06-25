/**
 * SCRIPT DE PRUEBAS AUTOMATIZADAS - RED DE EMERGENCIA
 * Ejecuta este script para validar que el servidor en Railway
 * y el Bot de Telegram responden correctamente a los filtros de prioridad.
 */

const RAILWAY_URL = 'https://crisis-response-network-production.up.railway.app';
const WEBHOOK_SECRET = 'emergency_secret_token_2026';

const HEADERS = {
  'Content-Type': 'application/json',
  'x-webhook-secret': WEBHOOK_SECRET
};

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function runTests() {
  console.log('INICIANDO PRUEBAS DE DESPACHO INTELIGENTE EN PRODUCTION...\n');
  console.log(`Destino: ${RAILWAY_URL}/api/webhooks/db-change\n`);

  console.log('[TEST 1] Enviando reporte de persona HERIDA (INSERT)...');
  const payloadHerido = {
    type: 'INSERT',
    table: 'persons',
    record: {
      id: '00000000-0000-0000-0000-000000000001',
      name_desc: 'Simulacro: Persona con fractura expuesta',
      status: 'herido',
      location_text: 'Sotano colapsado de prueba',
      reporter_contact: '0412-TEST-SOS',
      trust_level: 0
    }
  };

  try {
    const res = await fetch(`${RAILWAY_URL}/api/webhooks/db-change`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payloadHerido)
    });
    const result = await res.json();
    console.log('Respuesta del servidor:', result);
    if (result.telegram_notified) {
      console.log('EXITO: El servidor proceso el SOS y notifico a Telegram.\n');
    } else {
      console.log('FALLO: El servidor ignoro la alerta o fallo al notificar Telegram.\n');
    }
  } catch (err) {
    console.error('ERROR de conexion:', err.message, '\n');
  }

  await delay(1500);

  console.log('[TEST 2] Actualizando persona de BUSCADO a A SALVO (UPDATE)...');
  const payloadMilagro = {
    type: 'UPDATE',
    table: 'persons',
    record: {
      id: '00000000-0000-0000-0000-000000000002',
      name_desc: 'Simulacro: Maria Elena Perez',
      status: 'a_salvo',
      location_text: 'Encontrada en refugio Papa Carrillo',
      reporter_contact: '0424-TEST-OK',
      trust_level: 1
    },
    old_record: {
      id: '00000000-0000-0000-0000-000000000002',
      status: 'buscado'
    }
  };

  try {
    const res = await fetch(`${RAILWAY_URL}/api/webhooks/db-change`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payloadMilagro)
    });
    const result = await res.json();
    console.log('Respuesta del servidor:', result);
    if (result.telegram_notified) {
      console.log('EXITO: El bot canto el Milagro en Telegram.\n');
    } else {
      console.log('FALLO: No se reconocio la actualizacion de estado.\n');
    }
  } catch (err) {
    console.error('ERROR de conexion:', err.message, '\n');
  }

  await delay(1500);

  console.log('[TEST 3] Enviando persona simplemente BUSCADA (INSERT)...');
  const payloadSpam = {
    type: 'INSERT',
    table: 'persons',
    record: {
      id: '00000000-0000-0000-0000-000000000003',
      name_desc: 'Simulacro: Juan Perez (Buscado)',
      status: 'buscado',
      location_text: 'Chacao',
      reporter_contact: '0414-TEST-SPAM',
      trust_level: 0
    }
  };

  try {
    const res = await fetch(`${RAILWAY_URL}/api/webhooks/db-change`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payloadSpam)
    });
    const result = await res.json();
    console.log('Respuesta del servidor:', result);
    if (result.status === 'ignored') {
      console.log('EXITO: El bot ignoro el reporte silenciosamente como esperabamos (cero spam).\n');
    } else {
      console.log('FALLO: Se notifico algo que debio ser filtrado.\n');
    }
  } catch (err) {
    console.error('ERROR de conexion:', err.message, '\n');
  }

  console.log('PRUEBAS FINALIZADAS.');
}

runTests();