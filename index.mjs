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
  content: `Eres Alejandro iA, el asistente solar emocional de Green Power Tech Store.
Hablas con empatía, claridad y profesionalismo, con estilo cálido y caribeño.
No repitas preguntas de datos una vez se hayan recibido.
Guía al cliente paso a paso hacia la mejor solución solar o backup para su hogar o negocio.`
};

// __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Session storage temporal en memoria
const sessions = {}; // sessionId -> { step, data }

// Ruta principal: sirve el frontend
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: path.join(__dirname, "public") });
});

// Endpoint del chatbot
app.post("/chat", async (req, res) => {
  const { message, sessionId } = req.body;
  if (!sessionId) return res.json({ reply: "⚠️ No sessionId provided" });

  // Inicializar sesión si no existe
  if (!sessions[sessionId]) {
    sessions[sessionId] = { step: "welcome", data: {} };
  }

  const session = sessions[sessionId];
  let reply = "";

  try {
    switch (session.step) {
      case "welcome":
        reply = `🌞 ¡Bienvenido a Green Power Tech Store! Soy Alejandro iA. ¿En qué sistema estás interesado?\n• 1. Energía Solar\n• 2. Backup`;
        session.step = "ask_system";
        break;

      case "ask_system":
        session.data.system = message;
        reply = `👋 Antes de continuar, por favor compárteme tu nombre y número de teléfono para poder ofrecerte una orientación adecuada y prepararte una cotización formal.`;
        session.step = "ask_lead";
        break;

      case "ask_lead":
        // Intentamos extraer nombre y teléfono (simple ejemplo)
        const nameMatch = message.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
        const phoneMatch = message.match(/(\(?\d{3}\)?[\s-]?\d{3}-?\d{4})/);

        if (nameMatch && phoneMatch) {
          session.data.name = nameMatch[0];
          session.data.phone = phoneMatch[0];

          // Enviar lead
          await send_lead({ name: session.data.name, phone: session.data.phone });

          reply = `✅ Gracias por compartir tus datos, ${session.data.name}. Ahora puedo continuar con la orientación sobre ${session.data.system}.`;

          // Siguiente paso según sistema
          if (session.data.system.toLowerCase().includes("backup")) {
            reply += `\n¿Cuáles equipos deseas energizar con el backup?`;
            session.step = "backup_details";
          } else {
            reply += `\n¿Cuál fue tu factura eléctrica más reciente sin incluir atrasos? Esto me ayudará a recomendarte la mejor solución solar.`;
            session.step = "solar_details";
          }
        } else {
          reply = `⚠️ Por favor, proporciona tu nombre completo y número de teléfono para continuar.`;
        }
        break;

      case "backup_details":
        session.data.backupEquipments = message;
        reply = `Perfecto, con base en tus equipos, te recomiendo el siguiente sistema de Backup: [Sistema recomendado].\n💳 Pago aproximado: 100% = $X / mes, 110% = $Y / mes\n¿Deseas que te envíe la propuesta formal por email?`;
        session.step = "ask_email_backup";
        break;

      case "solar_details":
        session.data.latestBill = message;
        reply = `Gracias. Basado en tu factura de $${session.data.latestBill}, te recomiendo el siguiente sistema solar: [Sistema recomendado].\n💳 Pago aproximado: 100% = $X / mes, 110% = $Y / mes\n¿Deseas que te envíe la propuesta formal por email?`;
        session.step = "ask_email_solar";
        break;

      case "ask_email_backup":
      case "ask_email_solar":
        if (message.includes("@")) {
          session.data.email = message;
          await send_email({
            to: session.data.email,
            subject: "Propuesta formal de Green Power Tech Store",
            text: `Gracias por tu interés. Aquí tienes la propuesta formal del sistema recomendado: ${session.data.system}. Precio: [precio], enlace de compra: [URL], beneficios: [resumen], garantía: [resumen]. Válido 15 días desde hoy.`
          });
          reply = `✅ Propuesta enviada a ${session.data.email}. Si deseas, puedo ayudarte a coordinar la instalación o responder cualquier duda.`;
          session.step = "finished";
        } else {
          reply = `⚠️ Por favor proporciona un correo electrónico válido para enviarte la propuesta.`;
        }
        break;

      case "finished":
        reply = `👍 Estoy aquí para ayudarte con cualquier otra pregunta o sistema que quieras conocer.`;
        break;

      default:
        reply = `⚠️ Lo siento, no entendí tu mensaje. ¿Puedes reformularlo?`;
        break;
    }

  } catch (error) {
    console.error("Error al procesar chat:", error.message);
    reply = `⚠️ Alejandro iA no pudo responder en este momento.`;
  }

  res.json({ reply });
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`✅ Alejandro iA activo en el puerto ${PORT}`);
});
