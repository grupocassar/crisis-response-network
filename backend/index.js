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
// Token de seguridad para evitar que externos inunden el webhook
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'emergency_secret_token_2026';

// --- FUNCIÓN DE ENVÍO DE TELEGRAM CON RETRIES (Resiliencia 2G) ---
async function sendTelegramMessage(text, retries = 3, delay = 1000) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️ Telegram no configurado. Faltan variables de entorno.');
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
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
      console.error(`Intento ${i + 1} falló con estado: ${response.status}`);
    } catch (err) {
      console.error(`Intento ${i + 1} de Telegram dio error:`, err.message);
    }
    if (i < retries - 1) await new Promise(res => setTimeout(res, delay * (i + 1)));
  }
  return false;
}

// --- ENDPOINTS ---

// 1. Diagnóstico de Salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    telegram_configured: !!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
  });
});

// 2. Webhook de Supabase (Escucha cambios en vivo de DB)
app.post('/api/webhooks/db-change', async (req, res) => {
  const authHeader = req.headers['x-webhook-secret'];
  if (authHeader !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'No autorizado. Token de webhook inválido.' });
  }

  const { type, table, record } = req.body;

  if (type !== 'INSERT') {
    return res.json({ status: 'ignored', reason: 'Solo se procesan inserciones (INSERT)' });
  }

  let telegramText = '';

  if (table === 'persons') {
    const statusIcons = {
      'buscado': '🚨 *BUSCADO*',
      'a_salvo': '🟢 *A SALVO*',
      'herido': '⚠️ *HERIDO*',
      'fallecido': '💀 *FALLECIDO*'
    };
    const icon = statusIcons[record.status] || '👤';

    telegramText = `
${icon} *NUEVO REPORTE DE PERSONA*
----------------------------------------
*Nombre/Desc:* ${record.name_desc}
*Estado Vital:* ${record.status?.toUpperCase() || 'DESCONOCIDO'}
*Última Ubicación:* ${record.location_text || 'No especificada'}
*Contacto Reportador:* ${record.reporter_contact}
*Nivel de Confianza:* Civil (Nivel ${record.trust_level ?? 0})
----------------------------------------
_Verificado en el sistema central_
`;
  } else if (table === 'zones') {
    const urgencyIcons = {
      'alta': '🔥 *URGENCIA ALTA*',
      'media': '⚡ *URGENCIA MEDIA*',
      'baja': '🔵 *URGENCIA BAJA*'
    };
    const icon = urgencyIcons[record.urgency] || '📍';

    telegramText = `
${icon} *ALERTA: NUEVA ZONA CRÍTICA*
----------------------------------------
*Sector:* ${record.name}
*Situación:* ${record.situation}
*Nivel de Alerta:* ${record.urgency?.toUpperCase() || 'DESCONOCIDO'}
*Contacto en Sitio:* ${record.reporter_contact}
----------------------------------------
_Coordinar equipos de rescate inmediato_
`;
  }

  if (telegramText) {
    const sent = await sendTelegramMessage(telegramText);
    return res.json({ status: 'processed', telegram_notified: sent });
  }

  res.json({ status: 'ignored', reason: 'Tabla no soportada para notificaciones' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Emergencias corriendo en puerto ${PORT}`);
});
