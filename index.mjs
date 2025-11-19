import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { send_lead, send_email } from "./functions.js";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// GPT config
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const GPT_MODEL = process.env.GPT_MODEL || "gpt-4";

// Prompt Maestro
const promptMaestro = {
  role: "system",
  content: `🎯 Eres Alejandro Ai, el asesor solar inteligente de Green Power Tech Store. 
Hablas en español con acento profesional, persuasivo y cálido, siguiendo las instrucciones de tu PROMPT MAESTRO. 
• Solicita datos de contacto solo una vez.
• Extrae leads y llama send_lead.
• Envía cotizaciones solo con email y llama send_email.
• Mantén respuestas breves, directas y profesionales.
• Nunca repitas solicitudes de datos si ya se tienen.
• Usa emojis con intención emocional y lenguaje consultivo.`
};

// __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Simulación de sesiones para recordar datos por usuario
const sessions = {}; // key = userId o sessionId

// Ruta principal: sirve frontend
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: path.join(__dirname, "public") });
});

// Endpoint del chat
app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;
  if (!sessionId) return res.status(400).json({ reply: "⚠️ No sessionId provided" });

  // Inicializa sesión si no existe
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      name: null,
      phone: null,
      email: null,
      interest: null,
      step: "inicio"
    };
  }
  const session = sessions[sessionId];

  // Extraer datos básicos si vienen en el mensaje
  // (puede mejorarse con regex más robusto)
  const nameMatch = message.match(/(?:mi nombre es|me llamo|soy)\s+([A-Za-zÁÉÍÓÚñáéíóú\s]+)/i);
  if (nameMatch && !session.name) session.name = nameMatch[1].trim();

  const phoneMatch = message.match(/(?:mi teléfono es|mi número es|teléfono|(\(\d{3}\)\s?\d{3}-\d{4}))/i);
  if (phoneMatch && !session.phone) session.phone = phoneMatch[1].trim();

  const emailMatch = message.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  if (emailMatch && !session.email) session.email = emailMatch[0].trim();

  // Detectar interés
  if (!session.interest) {
    if (/solar/i.test(message)) session.interest = "Energía Solar";
    else if (/backup|respaldo/i.test(message)) session.interest = "Backup";
  }

  // Construir contexto para OpenAI
  let context = `Estado de conversación: ${session.step}\n`;
  context += `Nombre: ${session.name || "desconocido"}\n`;
  context += `Teléfono: ${session.phone || "desconocido"}\n`;
  context += `Email: ${session.email || "desconocido"}\n`;
  context += `Interés: ${session.interest || "desconocido"}\n`;
  context += `Mensaje del cliente: ${message}\n`;

  try {
    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [
        promptMaestro,
        { role: "user", content: context }
      ],
      temperature: 0.7
    });

    let reply = completion.choices[0].message.content;

    // Llamadas a send_lead si ya tenemos nombre y teléfono
    if (session.name && session.phone && session.step === "inicio") {
      await send_lead({
        name: session.name,
        phone: session.phone,
        interest: session.interest
      });
      session.step = "datos_completos";
    }

    // Enviar email si cliente dio email y lo solicitó
    if (session.email && /cotización|propuesta|enviar/i.test(message)) {
      await send_email({
        to: session.email,
        subject: "Propuesta formal de Green Power Tech Store",
        text: `Gracias por su interés. Aquí tiene la propuesta formal del sistema recomendado: ${session.interest}. Precio: [precio]. Enlace de compra: [URL]. Beneficios: [resumen breve]. Garantía: [resumen breve]. Válida hasta ${new Date(Date.now() + 15*24*60*60*1000).toLocaleDateString()}.`
      });
      reply += "\n\n✅ Cotización enviada por correo electrónico.";
    }

    res.json({ reply });
  } catch (error) {
    console.error("Error OpenAI:", error.message);
    res.json({ reply: "⚠️ Alejandro Ai no pudo responder en este momento." });
  }
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`✅ Alejandro Ai activo en el puerto ${PORT}`);
});
