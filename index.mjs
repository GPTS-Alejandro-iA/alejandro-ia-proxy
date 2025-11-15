import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { send_lead, send_email } from "./functions.js"; // Importamos nuestras funciones
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Configuración para __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // Archivos estáticos (HTML, CSS, JS)

// Rutas
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint para enviar lead
app.post("/send-lead", async (req, res) => {
  try {
    const lead = req.body; // {name, phone, email?, bestTime?, address?}
    const result = await send_lead(lead);
    res.json({ success: true, result });
  } catch (err) {
    console.error("Error enviando lead:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para enviar email
app.post("/send-email", async (req, res) => {
  try {
    const emailData = req.body; // {to, subject, text}
    const result = await send_email(emailData);
    res.json({ success: true, result });
  } catch (err) {
    console.error("Error enviando email:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Inicializamos OpenAI (GPT-4.1 mini por defecto)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Endpoint para chat con Alejandro iA
app.post("/chat", async (req, res) => {
  try {
    const { message, conversation } = req.body;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: conversation.concat({ role: "user", content: message }),
      temperature: 0.7,
    });

    const reply = response.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error("Error en chat:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
