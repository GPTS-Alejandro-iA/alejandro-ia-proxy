// index.mjs completo y corregido – Alejandro Ai (con FSM + HubSpot + Email + PDF placeholder)

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import { send_lead, send_email } from "./functions.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// -------------------------------
// OpenAI CONFIG (Assistant Id)
// -------------------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

// -------------------------------
// File path utilities
// -------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------
// Middleware
// -------------------------------
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// -------------------------------
// FRONTEND
// -------------------------------
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: path.join(__dirname, "public") });
});

// -------------------------------
// FSM — Control del flujo conversacional
// -------------------------------
const sessionState = {}; // { sessionId: { state: "...", data: {...} } }

function getSession(sessionId) {
  if (!sessionState[sessionId]) {
    sessionState[sessionId] = {
      state: "SALUDO",
      data: {}
    };
  }
  return sessionState[sessionId];
}

// -------------------------------
// OPENAI — Run del Assistant
// -------------------------------
async function askAssistant(message, threadId) {
  const thread = threadId
    ? { id: threadId }
    : await openai.beta.threads.create();

  if (!threadId) threadId = thread.id;

  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: message
  });

  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: ASSISTANT_ID
  });

  // Esperar respuesta
  let completed = false;
  let tries = 0;
  let runStatus;

  while (!completed && tries < 20) {
    await new Promise(r => setTimeout(r, 700));
    runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    if (runStatus.status === "completed") completed = true;
    tries++;
  }

  const messages = await openai.beta.threads.messages.list(threadId, { limit: 1 });
  const text = messages.data[0].content[0].text.value;

  return { text, threadId };
}

// -------------------------------
// ENDPOINT DEL CHAT
// -------------------------------
app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const session = getSession(sessionId);

    let reply = "";

    // ---------------------------
    // FSM — Flujo Lógico
    // ---------------------------

    if (session.state === "SALUDO") {
      session.state = "PEDIR_DATOS";
      reply = "¡Hola! Soy **Alejandro Ai** 🤖☀️. Antes de orientarte, ¿Me compartes tu nombre y número de teléfono?";
      return res.json({ reply });
    }

    if (session.state === "PEDIR_DATOS") {
      // Extraer nombre & teléfono (básico)
      const nameMatch = message.match(/soy ([a-zA-Z ]+)/i);
      const phoneMatch = message.match(/(\d{10}|\d{3}[- ]?\d{3}[- ]?\d{4})/);

      if (nameMatch) session.data.name = nameMatch[1].trim();
      if (phoneMatch) session.data.phone = phoneMatch[1];

      if (!session.data.name || !session.data.phone) {
        reply = "Perfecto 😊. Solo necesito **tu nombre y número** para continuar.";
        return res.json({ reply });
      }

      // Envío a HubSpot
      await send_lead({ name: session.data.name, phone: session.data.phone });

      session.state = "ORIENTACION";
      reply = `¡Gracias ${session.data.name}! 🙌 Ahora sí: ¿Sobre cuál sistema deseas orientación?

1️⃣ Energía Solar Off-Grid
2️⃣ Backups para apartamentos u oficinas
3️⃣ Kits portátiles
4️⃣ Cotización personalizada
`;
      return res.json({ reply });
    }

    if (session.state === "ORIENTACION") {
      if (/4|coti|precio/i.test(message)) {
        session.state = "PEDIR_EMAIL_COTI";
        reply = "Perfecto 😄. Para enviarte tu cotización personalizada, ¿Cuál es tu e-mail?";
        return res.json({ reply });
      }

      // Dejar que el assistant responda técnicamente
      const assistantResponse = await askAssistant(message, session.threadId);
      session.threadId = assistantResponse.threadId;

      return res.json({ reply: assistantResponse.text });
    }

    if (session.state === "PEDIR_EMAIL_COTI") {
      const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Z]{2,}/i);

      if (!emailMatch) {
        return res.json({ reply: "Ese correo no parece válido 🤔. ¿Puedes verificarlo?" });
      }

      const email = emailMatch[0];
      session.data.email = email;

      // Enviar PDF / Cotización (placeholder)
      await send_email({
        to: email,
        subject: "Tu cotización — Green Power Tech Store",
        text: "Aquí está tu cotización solicitada. (PDF en desarrollo)"
      });

      session.state = "ORIENTACION";
      return res.json({ reply: `¡Listo! 📩 Te envié la cotización a **${email}**. ¿Quieres que te explique alguno de los sistemas?` });
    }

    // fallback
    reply = "Estoy aquí para ayudarte ☀️. ¿En qué más te puedo asistir?";
    res.json({ reply });

  } catch (err) {
    console.error("Chat error =>", err);
    res.json({ reply: "⚠️ Ocurrió un error inesperado en Alejandro Ai." });
  }
});

// -------------------------------
// INICIAR SERVIDOR
// -------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Alejandro Ai activo en el puerto ${PORT}`);
});
