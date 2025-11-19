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

// CONFIG OPENAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID;

// __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIDDLEWARE
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// SERVE FRONTEND
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: path.join(__dirname, "public") });
});

// CHAT ENDPOINT usando Threads + Runs del Assistant
app.post("/chat", async (req, res) => {
  const { message, leadData, emailData } = req.body;

  try {
    // 1️⃣ Crear un thread por conversación (simple si no usas usuarios)
    const thread = await openai.beta.threads.create();

    // 2️⃣ Enviar el mensaje del usuario
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });

    // 3️⃣ Ejecutar el Assistant
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    // 4️⃣ Obtener respuesta del Assistant
    const messages = await openai.beta.threads.messages.list(thread.id);

    const lastMessage = messages.data
      .filter(m => m.role === "assistant")
      .pop();

    const aiResponse =
      lastMessage?.content?.[0]?.text?.value ||
      "⚠️ Alejandro Ai no pudo responder.";

    // Opcionales: lead + email
    if (leadData?.name && leadData?.phone) {
      await send_lead(leadData);
    }

    if (emailData?.to && emailData?.subject && emailData?.text) {
      await send_email(emailData);
    }

    res.json({ reply: aiResponse });
  } catch (error) {
    console.error("❌ Error con OpenAI Assistant:", error);
    return res.json({
      reply:
        "⚠️ Ocurrió un error al conectarme con Alejandro iA. Intenta nuevamente."
    });
  }
});

// RUN SERVER
app.listen(PORT, () => {
  console.log(`🚀 Backend de Alejandro iA corriendo en puerto ${PORT}`);
});
