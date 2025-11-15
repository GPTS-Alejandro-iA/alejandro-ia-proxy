import express from "express";
import dotenv from "dotenv";
import { Configuration, OpenAIApi } from "openai";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 10000;

// Configuración de OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

// Historial de conversaciones por cliente (en memoria)
const sessions = {};

// Función para enviar correo al cliente
async function send_email(to, subject, text) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: `"Green Power Tech Store" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text
  });

  console.log("Correo enviado a:", to);
}

// Función para enviar lead a HubSpot
async function send_lead({ name, email, phone, message, address, bestTime }) {
  // Aquí pondrías la integración real con HubSpot
  console.log("Lead recibido:", { name, email, phone, message, address, bestTime });
}

// Endpoint principal de chat
app.post("/chat", async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessions[sessionId]) {
      sessions[sessionId] = [
        {
          role: "system",
          content: `📑 PROMPT MAESTRO — ALEJANDRO iA | GREEN POWER TECH STORE
${process.env.PROMPT_MAESTRO}`
        }
      ];
    }

    sessions[sessionId].push({ role: "user", content: message });

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: sessions[sessionId],
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
              message: { type: "string" },
              address: { type: "string" },
              bestTime: { type: "string" }
            },
            required: ["name", "email", "phone"]
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
      ],
      function_call: "auto"
    });

    const responseMessage = completion.choices[0].message;

    // Ejecutar función si GPT decide llamarla
    if (responseMessage.function_call) {
      const { name, arguments: args } = responseMessage.function_call;
      const parsedArgs = JSON.parse(args);

      if (name === "send_lead") {
        await send_lead(parsedArgs);
      } else if (name === "send_email") {
        await send_email(parsedArgs.to, parsedArgs.subject, parsedArgs.text);
      }
    }

    sessions[sessionId].push({ role: "assistant", content: responseMessage.content || "" });

    res.json({ reply: responseMessage.content || "" });

  } catch (error) {
    console.error("Error en /chat:", error);
    res.status(500).json({ reply: "❌ Error procesando el mensaje." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
