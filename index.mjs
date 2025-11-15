import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import fetch from "node-fetch"; // si tu Node lo requiere
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Estado temporal de usuarios
const userSessions = {};

// Función de envío de Lead (simulada)
async function send_lead(lead) {
  console.log("Lead recibido:", lead);
  // Aquí conectas con HubSpot u otro CRM
  return { success: true };
}

// Función de envío de email (simulada)
async function send_email({ to, subject, text }) {
  console.log("Email enviado a:", to, subject, text);
  // Aquí conectas con Nodemailer o tu servicio de correo
  return { success: true };
}

// Prompt Maestro base
function getSystemPrompt() {
  return `
🎯 Identidad y Propósito
Alejandro iA es el asesor solar inteligente de Green Power Tech Store.
Habla en español con acento neutral y profesional, proyecta empatía, autoridad técnica y entusiasmo genuino.
Optimizado para responder en WhatsApp, Messenger y Web.
Misión: ayudar al cliente a alcanzar independencia energética, reduciendo o eliminando su factura eléctrica con una recomendación precisa, rentable y personalizada.

💼 Personalidad de Alejandro iA
• Facilitador experto en ventas en línea
• Genio en neurointeligencia de ventas
• Lenguaje persuasivo y cálido
• Orientado a resultados
• Mentalidad de cierre digital

📋 Formulario Obligatorio de Captación de Lead
Debe primero preguntar al cliente cuál de nuestros sistemas le interesa:
1. Energía Solar Fuera de la red
2. Backups de Alta Capacidad
Luego, solicitar nombre y teléfono para continuar.
No repetir la solicitud si el cliente ya dio los datos mínimos.
Si el cliente solicita cotización, preguntar por e-mail y demás datos faltantes.
`;
}

// Función de interacción con GPT
async function askAlejandroIA(sessionId, userMessage) {
  if (!userSessions[sessionId]) {
    userSessions[sessionId] = {
      lead: {},
      step: "initial"
    };
  }

  const session = userSessions[sessionId];

  // Actualiza lead según lo que envíe el usuario
  const regexNamePhone = /([A-Za-zÁÉÍÓÚáéíóú\s]+),?\s*\(?(\d{3})\)?[-\s]?(\d{3})[-\s]?(\d{4})/;
  const match = userMessage.match(regexNamePhone);
  if (match) {
    session.lead.name = match[1].trim();
    session.lead.phone = `${match[2]}${match[3]}${match[4]}`;
  }

  if (!session.lead.name || !session.lead.phone) {
    // Solicitar datos si no están
    return `Para continuar con la orientación, por favor proporcione su nombre completo y número de teléfono.`;
  }

  // Llamada a OpenAI con GPT-4.1
  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: getSystemPrompt() },
      { role: "user", content: userMessage }
    ],
    functions: [
      {
        name: "send_lead",
        description: "Envía un lead a HubSpot",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            message: { type: "string" }
          },
          required: ["email"]
        }
      },
      {
        name: "send_email",
        description: "Envía un correo al cliente",
        parameters: {
          type: "object",
          properties: {
            to: { type: "string" },
            subject: { type: "string" },
            text: { type: "string" }
          },
          required: ["to", "subject", "text"]
        }
      }
    ]
  });

  const answer = response.choices[0].message;

  // Ejecutar función si GPT la llama
  if (answer.function_call) {
    const { name, arguments: args } = answer.function_call;
    if (name === "send_lead") {
      await send_lead(JSON.parse(args));
      return "Gracias por compartir su información. Podemos continuar con la orientación.";
    }
    if (name === "send_email") {
      await send_email(JSON.parse(args));
      return "La propuesta ha sido enviada a su correo electrónico.";
    }
  }

  return answer.content || "No pude generar respuesta.";
}

// Endpoint de chat
app.post("/chat", async (req, res) => {
  const { sessionId, message } = req.body;
  try {
    const reply = await askAlejandroIA(sessionId, message);
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.json({ reply: "❌ Ocurrió un error procesando su mensaje." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
