import express from 'express';
import { OpenAI } from 'openai';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID || "asst_pWq1M4v688jqCMtWxbliz9m9";
const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const WHATSAPP_APIKEY = process.env.WHATSAPP_APIKEY || "123456"; // CallMeBot API Key (gratis)
const OWNER_PHONE = process.env.OWNER_PHONE || "17876992140"; // Tu número

const sessions = new Map();

// ENVIAR LEAD A HUBSPOT + WHATSAPP
async function enviarLead(nombre, telefono, email = '', direccion = '', factura = '') {
  telefono = telefono.replace(/\D/g, '');

  await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        firstname: nombre.split(' ')[0] || 'SinNombre',
        lastname: nombre.split(' ').slice(1).join(' ') || 'SinApellido',
        phone: telefono,
        email: email,
        address: direccion,
        factura_promedio_luma: factura,
        lifecyclestage: 'lead',
        company: 'Green Power Tech Store'
      }
    })
  });

  // Notificación WhatsApp (CallMeBot - 100% gratis)
  const texto = encodeURIComponent(
    `LEAD NUEVO ⚡\n${nombre}\n${telefono}\n${email || 'Sin email'}\nDirección: ${direccion || 'No dio'}\nFactura: $${factura || 'No dijo'}`
  );
  await fetch(`https://api.callmebot.com/whatsapp.php?phone=${OWNER_PHONE}&text=${texto}&apikey=${WHATSAPP_APIKEY}`);

  console.log(`LEAD ENVIADO → ${nombre} | ${telefono} | $${factura}`);
}

// CAPTURA LEAD POR MENSAJE (regex)
async function capturarLeadRapido(message) {
  const nameMatch = message.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/i);
  const phoneMatch = message.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);

  if (nameMatch && phoneMatch) {
    const nombre = nameMatch[0].trim();
    const telefono = phoneMatch[0];
    const email = emailMatch ? emailMatch[0] : '';
    const direccion = message.split(',').slice(2).join(',').trim() || message.split('|')[1]?.trim() || '';

    await enviarLead(nombre, telefono, email, direccion);
    return true;
  }
  return false;
}

// RUTA PRINCIPAL DEL CHAT
app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  // Captura rápida por regex (siempre primero)
  const esLeadRapido = await capturarLeadRapido(message);
  if (esLeadRapido) {
    return res.json({
      reply: "¡Perfecto! Ya quedó tu información registrada correctamente.\nEn minutos te llega tu cotización por email.\n\n¿Cuál es tu factura promedio mensual con LUMA para darte el sistema exacto?"
    });
  }

  // Si no es lead rápido → usa el Assistant normal
  try {
    let threadId = sessions.get(sessionId);
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      sessions.set(sessionId, threadId);
    }

    await openai.beta.threads.messages.create(threadId, { role: "user", content: message });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
    });

    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      await new Promise(r => setTimeout(r, 800));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    const messages = await openai.beta.threads.messages.list(threadId);
    const reply = messages.data[0]?.content[0]?.text?.value || "Estoy aquí, dime cómo te ayudo";

    res.json({ reply });
  } catch (error) {
    console.error("Error:", error.message);
    res.json({ reply: "Un segundo, estoy preparando tu respuesta..." });
  }
});

// WEBHOOK PARA FUNCTION CALLING (capturar_lead desde el Assistant)
app.post('/webhook-lead', async (req, res) => {
  const { nombre, telefono, email, direccion, factura_promedio } = req.body;
  await enviarLead(nombre, telefono, email, direccion, factura_promedio);
  res.json({ success: true });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("ALEJANDRO AI 100% VIVO – LEADS A HUBSPOT + WHATSAPP");
  console.log(`https://gpts-alejandro-ai.onrender.com`);
});
