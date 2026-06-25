const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Claves de configuración del entorno
const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'emergency_secret_token_2026';

// Credenciales para interactuar con la DB de Supabase directamente desde el Bot
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mtbtgkzwaukqkayxfwqn.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YnRna3p3YXVrcWtheXhmd3FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTMzMzUsImV4cCI6MjA5NzkyOTMzNX0.Hhm8kNtc5AU9mg37n8bAT2W7iA9HnaK4KD5F69vYkdI';

const SUPABASE_HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

const SUBSCRIPTIONS_TABLE = 'telegram_subscriptions';

async function upsertTelegramSubscription(tableName, recordId, chatId) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUBSCRIPTIONS_TABLE}?on_conflict=table_name,record_id,chat_id`,
      {
        method: 'POST',
        headers: {
          ...SUPABASE_HEADERS,
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          table_name: tableName,
          record_id: recordId,
          chat_id: String(chatId)
        })
      }
    );

    if (!res.ok) {
      const body = await res.text();
      console.error('Error upsert subscription:', res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error upsert subscription:', err.message);
    return false;
  }
}

async function getTelegramSubscribers(tableName, recordId, fallbackChatId) {
  const recipients = new Set();
  if (fallbackChatId) recipients.add(String(fallbackChatId));

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${SUBSCRIPTIONS_TABLE}?table_name=eq.${tableName}&record_id=eq.${recordId}&select=chat_id`,
      { headers: SUPABASE_HEADERS }
    );

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows)) {
        rows.forEach((row) => {
          if (row?.chat_id) recipients.add(String(row.chat_id));
        });
      }
    } else {
      const body = await res.text();
      console.error('Error reading subscriptions:', res.status, body);
    }
  } catch (err) {
    console.error('Error reading subscriptions:', err.message);
  }

  return Array.from(recipients);
}

// --- FUNCIÓN DE ENVÍO DE TELEGRAM A UN CHAT ESPECÍFICO ---
async function sendTelegramMessageDirect(chatId, text, retries = 3, delay = 1000) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return false;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const isGlobalChannel = TELEGRAM_CHAT_ID && String(chatId) === String(TELEGRAM_CHAT_ID);
  const payload = {
    chat_id: chatId,
    text: text,
    ...(isGlobalChannel ? { parse_mode: 'Markdown' } : {})
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = await response.text();
      let description = '';
      try {
        const parsed = JSON.parse(body);
        description = parsed.description || '';
      } catch {
        description = '';
      }

      console.log('TELEGRAM chat_id:', String(chatId), 'status:', response.status);
      if (!response.ok && description) {
        console.log('TELEGRAM description:', description);
      }

      if (response.ok) return true;
    } catch (err) {
      console.error(`Error enviando mensaje directo a ${chatId}:`, err.message);
    }
    if (i < retries - 1) await new Promise(res => setTimeout(res, delay * (i + 1)));
  }
  return false;
}

// --- FUNCIÓN COMPATIBLE CON CANAL GLOBAL ---
async function sendTelegramMessage(text) {
  return sendTelegramMessageDirect(TELEGRAM_CHAT_ID, text);
}

// --- ENDPOINTS ---

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    telegram_configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
  });
});

// Endpoint de diagnóstico: devuelve la respuesta cruda de Telegram para un chat concreto
app.post('/api/debug/telegram-send', async (req, res) => {
  const authHeader = req.headers['x-webhook-secret'];
  if (authHeader !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'No autorizado. Token de webhook inválido.' });
  }

  if (!TELEGRAM_BOT_TOKEN) {
    return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN no configurado en el runtime.' });
  }

  const { chatId, text, withMarkdown = true } = req.body || {};
  if (!chatId || !text) {
    return res.status(400).json({ error: 'Faltan chatId o text.' });
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: String(chatId),
    text: String(text)
  };
  if (withMarkdown) payload.parse_mode = 'Markdown';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const body = await response.text();
    return res.status(200).json({
      ok: response.ok,
      status: response.status,
      payload,
      telegram_body: body
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message
    });
  }
});

// Setup de Webhook de Telegram (forzando https para cumplir requisitos estrictos de Telegram)
app.get('/api/setup-telegram', async (req, res) => {
  const host = req.headers.host;

  if (!TELEGRAM_BOT_TOKEN) {
    return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN no configurado.' });
  }

  try {
    // Forzar protocolo https:// aunque el proxy interno reporte http
    const webhookUrl = `https://${host}/api/webhooks/telegram`;
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${webhookUrl}`);
    const data = await response.json();
    res.json({ status: 'setup_executed', telegram_response: data, webhook_configured_url: webhookUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook del Bot de Telegram (captura eventos de deep link)
app.post('/api/webhooks/telegram', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.text) return res.sendStatus(200);

  const text = message.text;
  const chatId = message.chat.id;

  if (text.startsWith('/start')) {
    const parts = text.split(' ');
    if (parts.length > 1) {
      const payload = parts[1];
      const [type, ...idParts] = payload.split('_');
      const recordId = idParts.join('_');

      if ((type === 'person' || type === 'zone') && recordId) {
        const table = type === 'person' ? 'persons' : 'zones';
        try {
          const getRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${recordId}`, { headers: SUPABASE_HEADERS });
          const records = await getRes.json();

          if (records && records.length > 0) {
            const name = type === 'person' ? records[0].name_desc : records[0].name;

            // Guardar suscripción multi-usuario sin sobrescribir suscriptores previos
            const subscribed = await upsertTelegramSubscription(table, recordId, chatId);

            // Compatibilidad hacia atrás: mantener último chat en el campo legado
            await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${recordId}`, {
              method: 'PATCH',
              headers: SUPABASE_HEADERS,
              body: JSON.stringify({ telegram_chat_id: chatId.toString() })
            }).catch(() => null);

            if (subscribed) {
              await sendTelegramMessageDirect(chatId, `🔔 ENLACE DE ALERTAS EXITOSO\n\nTe has suscrito a las actualizaciones de:\n🪪 ${name.toUpperCase()}\n\nTe avisaré por este chat privado inmediatamente cuando un rescatista o familiar aporte nueva información sobre este registro.`);
            } else {
              await sendTelegramMessageDirect(chatId, '❌ Error en el servidor al asociar tu Telegram.');
            }
          } else {
            await sendTelegramMessageDirect(chatId, '❌ No se encontró el registro. Quizá fue removido.');
          }
        } catch (err) {
          console.error('Error en enlace de Telegram:', err);
          await sendTelegramMessageDirect(chatId, '❌ Error técnico al procesar el enlace profundo.');
        }
      }
    } else {
      await sendTelegramMessageDirect(chatId, `👋 Bienvenido al Bot de la Red de Emergencias.\n\nPara suscribirte a alertas de un familiar o foco de rescate, abre la página web y toca el botón "Recibir Alertas en Telegram" de ese registro.`);
    }
  }

  res.sendStatus(200);
});

// Webhook de Supabase (Procesamiento y despacho diferenciado: Global vs. Privado)
app.post('/api/webhooks/db-change', async (req, res) => {
  const authHeader = req.headers['x-webhook-secret'];
  if (authHeader !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'No autorizado. Token de webhook inválido.' });
  }

  const { type, table, record, old_record } = req.body;

  // Soportamos INSERT para reportes nuevos y UPDATE para ediciones de información
  if (type !== 'INSERT' && type !== 'UPDATE') {
    return res.json({ status: 'ignored', reason: 'Evento no soportado' });
  }

  let globalText = '';
  let privateText = '';

  if (table === 'persons') {
    const currentStatus = record.status;
    const previousStatus = old_record ? old_record.status : null;
    const currentLocation = record.location_text;
    const previousLocation = old_record ? old_record.location_text : null;
    const currentDoc = record.document_id;
    const previousDoc = old_record ? old_record.document_id : null;

    // 1. EVALUACIÓN CANAL GLOBAL (Filtro estricto anti-spam)
    let shouldNotifyGlobal = false;
    let globalTitle = '';

    if (currentStatus === 'herido' && (type === 'INSERT' || currentStatus !== previousStatus)) {
      shouldNotifyGlobal = true;
      globalTitle = '⚠️ *EMERGENCIA VITAL: SE REQUIERE MÉDICO*';
    } else if (currentStatus === 'a_salvo' && previousStatus && currentStatus !== previousStatus) {
      shouldNotifyGlobal = true;
      globalTitle = '🟢 *MILAGRO: PERSONA ENCONTRADA A SALVO*';
    } else if (currentStatus === 'fallecido' && previousStatus && currentStatus !== previousStatus) {
      shouldNotifyGlobal = true;
      globalTitle = '💀 *CONFIRMACIÓN DE FALLECIMIENTO*';
    }

    if (shouldNotifyGlobal) {
      globalText = `
${globalTitle}
----------------------------------------
*Nombre/Desc:* ${record.name_desc}
${record.document_id ? `*Cédula/Doc:* ${record.document_id}\n` : ''}*Ubicación:* ${record.location_text || 'No especificada'}
*Contacto en Sitio:* ${record.reporter_contact}
----------------------------------------
_Sistema de Despacho de Emergencias_
`;
    }

    // 2. EVALUACIÓN CHAT PRIVADO (Notificación detallada de CUALQUIER cambio)
    if (record.telegram_chat_id) {
      if (type === 'INSERT') {
        privateText = `
📝 NUEVO REPORTE REGISTRADO
----------------------------------------
Te has suscrito correctamente a las alertas de:
🪪 ${record.name_desc.toUpperCase()}

Estado actual: ${record.status.toUpperCase()}
Ubicación inicial: ${record.location_text || 'No especificada'}
${record.document_id ? `Cédula/Doc: ${record.document_id}\n` : ''}
Te notificaré de inmediato por este chat si hay alguna novedad o actualización.
----------------------------------------
`;
      } else if (type === 'UPDATE') {
        const changes = [];
        if (currentStatus !== previousStatus) {
          changes.push(`• Estado: de ${previousStatus.toUpperCase()} -> ${currentStatus.toUpperCase()}`);
        }
        if (currentLocation !== previousLocation) {
          changes.push(`• Ubicación: de ${previousLocation || 'No especificada'} -> ${currentLocation || 'No especificada'}`);
        }
        if (currentDoc !== previousDoc) {
          changes.push(`• Cédula/Doc: asignado ${currentDoc || 'No especificada'}`);
        }

        // Si realmente cambió algún campo de valor, enviamos la alerta detallada
        if (changes.length > 0) {
          let privateHeader = '🔄 ACTUALIZACIÓN EN TU ALERTA';
          if (currentStatus === 'a_salvo' && previousStatus && currentStatus !== previousStatus) {
            privateHeader = '🟢 MILAGRO: PERSONA ENCONTRADA A SALVO';
          } else if (currentStatus === 'herido' && (type === 'INSERT' || currentStatus !== previousStatus)) {
            privateHeader = '⚠️ EMERGENCIA VITAL: SE REQUIERE MÉDICO';
          } else if (currentStatus === 'fallecido' && previousStatus && currentStatus !== previousStatus) {
            privateHeader = '💀 CONFIRMACIÓN DE FALLECIMIENTO';
          }

          privateText = `
${privateHeader}
----------------------------------------
Se ha registrado nueva información sobre:
🪪 ${record.name_desc.toUpperCase()}

Cambios detectados:
${changes.join('\n')}
----------------------------------------
Notificación en vivo de tu suscripción personal.
`;
        }
      }
    }
  } else if (table === 'zones') {
    const currentUrgency = record.urgency;
    const previousUrgency = old_record ? old_record.urgency : null;
    const currentSituation = record.situation;
    const previousSituation = old_record ? old_record.situation : null;

    // 1. EVALUACIÓN CANAL GLOBAL (Solo focos de urgencia máxima)
    if (currentUrgency === 'alta' && (type === 'INSERT' || currentUrgency !== previousUrgency)) {
      globalText = `
🔥 *CÓDIGO ROJO: FOCO DE RESCATE CRÍTICO*
----------------------------------------
*Sector:* ${record.name}
*Situación:* ${record.situation}
*Contacto:* ${record.reporter_contact}
----------------------------------------
_Prioridad máxima. Envíen equipo de rescate pesado._
`;
    }

    // 2. EVALUACIÓN CHAT PRIVADO (Cualquier evolución de la zona de peligro)
    if (record.telegram_chat_id) {
      if (type === 'INSERT') {
        privateText = `
📍 NUEVO FOCO DE RESCATE REGISTRADO
----------------------------------------
Suscripción activa para la zona de riesgo:
🏡 ${record.name.toUpperCase()}

Urgencia inicial: ${record.urgency.toUpperCase()}
Situación reportada: ${record.situation}
----------------------------------------
`;
      } else if (type === 'UPDATE') {
        const changes = [];
        if (currentUrgency !== previousUrgency) {
          changes.push(`• Urgencia: de ${previousUrgency.toUpperCase()} -> ${currentUrgency.toUpperCase()}`);
        }
        if (currentSituation !== previousSituation) {
          changes.push(`• Situación: de ${previousSituation} -> ${currentSituation}`);
        }

        if (changes.length > 0) {
          privateText = `
🔄 ACTUALIZACIÓN EN FOCO DE RESCATE
----------------------------------------
Nueva evolución en la zona que estás monitoreando:
🏡 ${record.name.toUpperCase()}

Cambios registrados:
${changes.join('\n')}
----------------------------------------
`;
        }
      }
    }
  }

  // Despacho asíncrono e independiente de mensajes
  let sentGlobal = false;
  let sentPrivate = false;

  if (globalText) {
    sentGlobal = await sendTelegramMessage(globalText);
  }

  if (privateText) {
    const recipients = await getTelegramSubscribers(table, record.id, record.telegram_chat_id);
    let delivered = 0;

    for (const chatId of recipients) {
      const ok = await sendTelegramMessageDirect(chatId, privateText);
      if (ok) delivered += 1;
    }

    sentPrivate = delivered > 0;
  }

  res.json({ 
    status: 'processed', 
    telegram_global_notified: sentGlobal, 
    telegram_private_notified: sentPrivate,
    telegram_notified: sentGlobal || sentPrivate
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Emergencias corriendo en puerto ${PORT}`);
});