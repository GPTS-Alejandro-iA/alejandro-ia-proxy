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
  content: `Eres Alejandro iA, el asistente solar emocional de Green Power Tech Store. Tu misión es guiar a los clientes de Puerto Rico con empatía, claridad y profesionalismo. Hablas con calidez caribeña, usas emojis con intención emocional, y siempre refuerzas la confianza, la autonomía y la esperanza. Nunca das respuestas genéricas. Siempre cierras con una pregunta que invite a continuar la conversación o tomar acción.`
};

// __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Ruta principal: sirve el frontend
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: path.join(__dirname, "public") });
});

// Endpoint del chatbot
app.post("/chat", async (req, res) => {
  const { message, leadData, emailData } = req.body;

  let responseText = "⚠️ Alejandro iA no pudo responder en este momento.";

  try {
    const completion = await openai.chat.completions.create({
      model: GPT_MODEL,
      messages: [promptMaestro, { role: "user", content: message }],
      temperature: 0.7
    });

    responseText = completion.choices[0].message.content;
  } catch (error) {
    console.error("Error al conectar con OpenAI:", error.message);
  }

  // Captación de lead
  if (leadData?.name && leadData?.phone) {
    await send_lead(leadData);
  }

  // Envío de correo
  if (emailData?.to && emailData?.subject && emailData?.text) {
    await send_email(emailData);
  }

  res.json({ reply: responseText });
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`✅ Alejandro iA activo en el puerto ${PORT}`);
});
