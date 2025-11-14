import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // sirve index.html y demás archivos

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

// Función para enviar lead a HubSpot
async function send_lead(lead) {
  try {
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          firstname: lead.name.split(' ')[0],
          lastname: lead.name.split(' ').slice(1).join(' '),
          phone: lead.phone,
          email: lead.email || '',
          address: lead.address || '',
          notes: lead.message || '',
          best_time: lead.best_time || ''
        }
      })
    });
    return await res.json();
  } catch (e) {
    console.error('Error send_lead:', e);
  }
}

// Función para enviar correo
async function send_email(emailData) {
  try {
    const res = await fetch('https://api.your-email-service.com/send', { // reemplaza con tu servicio real
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });
    return await res.json();
  } catch (e) {
    console.error('Error send_email:', e);
  }
}

// Endpoint de chat
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await fetch(`https://api.openai.com/v1/assistants/${ASSISTANT_ID}/message`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();
    let reply = data.output?.[0]?.content?.[0]?.text || "Lo siento, hubo un error al responder.";

    // Detectar si el usuario ya compartió nombre y teléfono
    const nameMatch = userMessage.match(/Nombre:?\s*(.+)/i);
    const phoneMatch = userMessage.match(/Tel[eé]fono:?\s*(.+)/i);

    if (nameMatch && phoneMatch) {
      const lead = {
        name: nameMatch[1].trim(),
        phone: phoneMatch[1].trim()
      };
      // Optional: dirección, email, mensaje
      const addressMatch = userMessage.match(/Direcci[oó]n:?\s*(.+)/i);
      const emailMatch = userMessage.match(/Email:?\s*(.+)/i);
      const messageMatch = userMessage.match(/Mensaje:?\s*(.+)/i);

      if (addressMatch) lead.address = addressMatch[1].trim();
      if (emailMatch) lead.email = emailMatch[1].trim();
      if (messageMatch) lead.message = messageMatch[1].trim();

      await send_lead(lead);

      if (lead.email) {
        await send_email({
          to: lead.email,
          subject: 'Gracias por contactarnos - Green Power Tech Store',
          text: `Hola ${lead.name}, gracias por tu interés. Alejandro iA está preparando tu cotización personalizada.`
        });
      }

      reply += "\n\n✅ Tu información ha sido registrada con éxito. Alejandro iA te guiará a continuación.";
    }

    res.json({ reply });

  } catch (err) {
    console.error('Error /chat:', err);
    res.json({ reply: "⚠️ Error de conexión con OpenAI." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,
           }     
