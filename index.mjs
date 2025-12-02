import express from 'express';
import { OpenAI } from 'openai';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// LEE TODO DESDE .env DE RENDER (100% garantizado)
const {
  ASSISTANT_ID,
  OPENAI_API_KEY,
  HUBSPOT_API_KEY,
  EMAIL_USER,
  EMAIL_PASS,
  COMPANY_NAME,
  PORT = 10000
} = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const sessions = new Map();

// TRANSPORTER DE EMAIL (Gmail SMTP – funciona perfecto)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

async function enviarCotizacion({ name, email, phone, address, sistema, precio, enlace }) {
  const html = `
    <h2>¡Hola ${name.split(' ')[0]}! Gracias por confiar en ${COMPANY_NAME}</h2>
    <p>Tu sistema recomendado es:</p>
    <h3>${sistema} → $${Number(precio).toLocaleString()} instalado</h3>
    <p><a href="${enlace}" style="background:#00d4aa;color:white;padding:15px 30px;text-decoration:none;border-radius:8px;font-size:18px;">COMPRAR AHORA 100% EN LÍNEA</a></p>
    <p>O llámanos al <strong>787-699-2140</strong> para financiamiento o cheque.</p>
    <p>¡Quedo a la orden!</p>
    <p><strong>Alejandro</strong><br>${COMPANY_NAME}</p>
  `;

  await transporter.sendMail({
    from: `"Alejandro - ${COMPANY_NAME}" <${EMAIL_USER}>`,
    to: [email, EMAIL_USER], // cliente + copia a ti
    subject: `¡${name.split(' ')[0]}! Aquí tienes tu cotización solar`,
    html
  });
}

app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  let threadId = sessions.get(sessionId);
  if (!threadId) {
    const thread = await openai.beta.threads.create();
    threadId = thread.id;
    sessions.set(sessionId, threadId);
  }

  await openai.beta.threads.messages.create(threadId, { role: "user", content: message });

  let run = await openai.beta.threads.runs.create(threadId, { assistant_id: ASSISTANT_ID });

  while (["queued", "in_progress", "requires_action"].includes(run.status)) {
    if (run.status === "requires_action") {
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;

      for (const tool of toolCalls) {
        if (tool.function.name === "send_lead") {
          const args = JSON.parse(tool.function.arguments);

          // 1. ENVÍA A HUBSPOT
          await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              properties: {
                firstname: args.name?.split(' ')[0] || '',
                lastname: args.name?.split(' ').slice(1).join(' ') || '',
                phone: args.phone || '',
                email: args.email || '',
                address: args.address || '',
                lifecyclestage: 'lead',
                company: COMPANY_NAME
              }
            })
          });

          // 2. ENVÍA EMAIL SI TIENE
          if (args.email && args.email.includes('@')) {
            await enviarCotizacion({
              name: args.name || 'Cliente',
              email: args.email,
              phone: args.phone || '',
              address: args.address || '',
              sistema: args.sistema || 'Sistema Solar Personalizado',
              precio: args.precio || 0,
              enlace: args.enlace || 'https://greenpowertech.store'
            });
          }

          console.log("LEAD + EMAIL ENVIADO:", args);
        }
      }

      const toolOutputs = toolCalls.map(t => ({
        tool_call_id: t.id,
        output: JSON.stringify({ success: true })
      }));

      run = await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, { tool_outputs: toolOutputs });
    } else {
      await new Promise(r => setTimeout(r, 800));
      run = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }
  }

  const messages = await openai.beta.threads.messages.list(threadId);
  const reply = messages.data[0].content[0].text.value;
  res.json({ reply });
});

app.listen(PORT, () => {
  console.log(`${COMPANY_NAME} - Alejandro 100% AUTOMÁTICO en puerto ${PORT}`);
});
