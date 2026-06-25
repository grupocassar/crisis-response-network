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

// --- FUNCIÓN DE ENVÍO DE TELEGRAM A UN CHAT ESPECÍFICO ---
async function sendTelegramMessageDirect(chatId, text, retries = 3, delay = 1000) {
  if (!TELEGRAM_BOT_TOKEN || !chatId) return false;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown'
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
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

            // Enlazar Chat ID de Telegram en Supabase
            const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${recordId}`, {
              method: 'PATCH',
              headers: SUPABASE_HEADERS,
              body: JSON.stringify({ telegram_chat_id: chatId.toString() })
            });

            if (updateRes.ok) {
              await sendTelegramMessageDirect(chatId, `🔔 *¡ENLACE DE ALERTAS EXITOSO!*\n\nTe has suscrito a las actualizaciones de:\n🪪 *${name.toUpperCase()}*\n\nTe avisaré por este chat privado inmediatamente cuando un rescatista o familiar aporte nueva información sobre este registro.`);
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
      await sendTelegramMessageDirect(chatId, `👋 *Bienvenido al Bot de la Red de Emergencias.*\n\nPara suscribirte a alertas de un familiar o foco de rescate, abre la página web y toca el botón *"Recibir Alertas en Telegram"* de ese registro.`);
    }
  }

  res.sendStatus(200);
});

// Webhook de Supabase
app.post('/api/webhooks/db-change', async (req, res) => {
  const authHeader = req.headers['x-webhook-secret'];
  if (authHeader !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const { type, table, record, old_record } = req.body;

  if (type !== 'INSERT' && type !== 'UPDATE') {
    return res.json({ status: 'ignored', reason: 'Evento no soportado' });
  }

  let telegramText = '';

  if (table === 'persons') {
    const currentStatus = record.status;
    const previousStatus = old_record ? old_record.status : null;
    
    let shouldNotify = false;
    let title = '';

    // Solo notifica cambios reales de estado en UPDATE para evitar spam
    if (currentStatus === 'herido' && previousStatus !== 'herido') {
      shouldNotify = true;
      title = '⚠️ *EMERGENCIA VITAL: SE REQUIERE MÉDICO*';
    } else if (currentStatus === 'a_salvo' && previousStatus !== 'a_salvo') {
      shouldNotify = true;
      title = '🟢 *MILAGRO: PERSONA ENCONTRADA A SALVO*';
    } else if (currentStatus === 'fallecido' && previousStatus !== 'fallecido') {
      shouldNotify = true;
      title = '💀 *CONFIRMACIÓN DE FALLECIMIENTO*';
    }

    if (shouldNotify) {
      telegramText = `
${title}
----------------------------------------
*Nombre/Desc:* ${record.name_desc}
${record.document_id ? `*Cédula/Doc:* ${record.document_id}\n` : ''}*Ubicación:* ${record.location_text || 'No especificada'}
*Contacto en Sitio:* ${record.reporter_contact}
----------------------------------------
_Sistema de Despacho de Emergencias_
`;
    }
  } else if (table === 'zones') {
    const currentUrgency = record.urgency;
    const previousUrgency = old_record ? old_record.urgency : null;

    if (currentUrgency === 'alta' && previousUrgency !== 'alta') {
      telegramText = `
🔥 *CÓDIGO ROJO: FOCO DE RESCATE CRÍTICO*
----------------------------------------
*Sector:* ${record.name}
*Situación:* ${record.situation}
*Contacto:* ${record.reporter_contact}
----------------------------------------
_Prioridad máxima. Envíen equipo pesado._
`;
    }
  }

  if (telegramText) {
    const sentGlobal = await sendTelegramMessage(telegramText);

    let sentPrivate = false;
    if (record.telegram_chat_id) {
      const privateText = `🔔 *NOTIFICACIÓN DE TU ALERTA SUSCRITA:*\n${telegramText}`;
      sentPrivate = await sendTelegramMessageDirect(record.telegram_chat_id, privateText);
    }

    // Compatibilidad hacia atrás: mantener telegram_notified
    return res.json({
      status: 'processed',
      telegram_notified: sentGlobal,
      telegram_global_notified: sentGlobal,
      telegram_private_notified: sentPrivate
    });
  }

  res.json({ status: 'ignored', reason: 'No cumple reglas de prioridad crítica' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Emergencias corriendo en puerto ${PORT}`);
});