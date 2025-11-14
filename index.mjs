import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import nodemailer from 'nodemailer';
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Configuración de Nodemailer para Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// Función para enviar correo
async function sendEmail(to, subject, text) {
  try {
    await transporter.sendMail({ from: process.env.GMAIL_USER, to, subject, text });
    console.log(`Correo enviado a ${to}`);
  } catch (err) {
    console.error("Error enviando correo:", err);
  }
}

// Función para enviar lead a HubSpot
async function sendLeadToHubspot({ name, email, phone, message }) {
  try {
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: { firstname: name, email, phone, message }
      })
    });
    const data = await res.json();
    console.log("Lead enviado a HubSpot:", data);
  } catch (err) {
    console.error("Error enviando lead a HubSpot:", err);
  }
}

// Ruta principal
app.get('/', (req, res) => res.sendFile(`${process.cwd()}/public/index.html`));

// Manejo de mensajes del chat
app.post('/chat', async (req, res) => {
  const { message, name, email, phone } = req.body;

  if (!message) return res.json({ reply: "No se recibió mensaje." });

  try {
    // Llamada a la API de OpenAI
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant: process.env.ASSISTANT_ID,
        input: message
      })
    });

    const data = await response.json();
    let reply = data.output?.[0]?.content?.[0]?.text || "Lo siento, hubo un error al responder.";

    // Si el mensaje incluye datos del cliente, enviarlos a HubSpot y correo
    if (name && email) {
      await sendLeadToHubspot({ name, email, phone, message });
      await sendEmail(email, "Gracias por tu interés en Green Power Tech", `Hola ${name},\n\nGracias por contactarnos. Pronto recibirás tu cotización y más información.\n\nSaludos,\nAlejandro iA`);
    }

    res.json({ reply });

  } catch (err) {
    console.error(err);
    res.json({ reply: "Lo siento, ocurrió un error en el servidor." });
  }
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
