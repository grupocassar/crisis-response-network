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

// --- FUNCIÓN DE ENVÍO DE TELEGRAM CON RETRIES ---
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

// 2. Webhook de Supabase (Motor de Buscapersonas Inteligente)
app.post('/api/webhooks/db-change', async (req, res) => {
  const authHeader = req.headers['x-webhook-secret'];
  if (authHeader !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'No autorizado. Token de webhook inválido.' });
  }

  const { type, table, record, old_record } = req.body;

  // Permitimos INSERT y UPDATE, descartamos DELETE
  if (type !== 'INSERT' && type !== 'UPDATE') {
    return res.json({ status: 'ignored', reason: 'Evento no soportado' });
  }

  let telegramText = '';

  // ==========================================
  // LÓGICA DE FILTRADO PARA PERSONAS
  // ==========================================
  if (table === 'persons') {
    const currentStatus = record.status;
    const previousStatus = old_record ? old_record.status : null;
    
    let shouldNotify = false;
    let title = '';

    // Regla 1: SOS Vital (Siempre avisa si alguien está herido)
    if (currentStatus === 'herido') {
      shouldNotify = true;
      title = '⚠️ *EMERGENCIA VITAL: SE REQUIERE MÉDICO*';
    } 
    // Regla 2: El Milagro (Avisa si pasó a estar A Salvo recién ahora)
    else if (currentStatus === 'a_salvo' && previousStatus !== 'a_salvo') {
      shouldNotify = true;
      title = '🟢 *MILAGRO: PERSONA ENCONTRADA A SALVO*';
    } 
    // Regla 3: Tragedia Confirmada
    else if (currentStatus === 'fallecido' && previousStatus !== 'fallecido') {
      shouldNotify = true;
      title = '💀 *CONFIRMACIÓN DE FALLECIMIENTO*';
    }
    // Si es "buscado", o si es una simple edición de texto, es ignorado silenciosamente.

    if (shouldNotify) {
      telegramText = `
${title}
----------------------------------------
*Nombre/Desc:* ${record.name_desc}
*Ubicación Actual:* ${record.location_text || 'No especificada'}
*Contacto en Sitio:* ${record.reporter_contact}
----------------------------------------
_Sistema de Despacho Central_
`;
    }
  } 
  
  // ==========================================
  // LÓGICA DE FILTRADO PARA ZONAS (FOCOS DE RESCATE)
  // ==========================================
  else if (table === 'zones') {
    const currentUrgency = record.urgency;
    const previousUrgency = old_record ? old_record.urgency : null;

    // Regla 4: Código Rojo (Solo notifica urgencia ALTA, y solo si es nueva o acaba de empeorar)
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

  // Si pasó nuestros estrictos filtros, despachamos el mensaje a Telegram
  if (telegramText) {
    const sent = await sendTelegramMessage(telegramText);
    return res.json({ status: 'processed', telegram_notified: sent });
  }

  // Si no cumplió ninguna regla, ignoramos para evitar spam
  res.json({ status: 'ignored', reason: 'No cumple reglas de prioridad crítica' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de Emergencias corriendo en puerto ${PORT}`);
});