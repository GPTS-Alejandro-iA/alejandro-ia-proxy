import express from 'express';
import { OpenAI } from 'openai';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile('index.html', { root: 'public' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = "asst_pWq1M4v688jqCMtWxbliz9m9";
const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN; // tu token real en Render
const EMAIL_USER = process.env.EMAIL_USER; // gpts.citas@gmail.com
const EMAIL_PASS = process.env.EMAIL_PASS;

const sessions = new Map();

// DETECTAR NOMBRE + TELÉFONO Y ENVIAR MANUALMENTE A HUBSPOT
async function enviarLeadManual(message) {
  // Regex para detectar nombre + teléfono en el mensaje
  const nameMatch = message.match(/([A-Z][a-z]+ [A-Z][a-z]+)/i);
  const phoneMatch = message.match(/(\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})/i);

  if (nameMatch && phoneMatch) {
    const name = nameMatch[0];
    const phone = phoneMatch[0].replace(/\D/g, ''); // solo números

    // ENVÍO REAL A HUBSPOT
    await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          firstname: name.split(' ')[0],
          lastname: name.split(' ').slice(1).join(' '),
          phone: phone,
          lifecyclestage: 'lead',
          company: 'Green Power Tech Store - Lead Alejandro AI'
        }
      })
    });

    console.log(`LEAD MANUAL ENVIADO A HUBSPOT: ${name} - ${phone}`);
  }
}

// EMAIL MANUAL (si detecta email)
async function enviarEmailManual(message) {
  const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/i);
  if (emailMatch) {
    const email = emailMatch[0];

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Alejandro - Green Power Tech <noreply@greenpowertech.store>',
        to: [email, EMAIL_USER],
        subject: 'Tu cotización solar – Green Power Tech Store',
        html: '<h2>¡Hola! En minutos te contactamos con tu cotización personalizada. Gracias por confiar en nosotros.</h2>'
      })
    });
  }
}

app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  // ENVIAR MANUALMENTE A HUBSPOT SI DETECTA NOMBRE + TELÉFONO
  await enviarLeadManual(message);

  // ENVIAR EMAIL MANUAL SI DETECTA EMAIL
  await enviarEmailManual(message);

  try {
    let threadId = sessions.get(sessionId);
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      sessions.set(sessionId, threadId);
    }

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: ASSISTANT_ID,
    }, { pollIntervalMs: 700, timeoutMs: 90000 });

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId);
      const reply = messages.data[0].content[0].text.value;
      res.json({ reply });
    } else {
      res.json({ reply: "Un segundo, procesando..." });
    }
  } catch (error) {
    console.error("Error:", error.message);
    res.json({ reply: "Error temporal. Intenta de nuevo." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Alejandro AI + HubSpot + Email en puerto ${PORT}`));
