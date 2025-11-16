import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { send_lead, send_email } from "./functions.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Necesario para usar __dirname con ES Modules
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

// Endpoint principal del chatbot
app.post("/chat", async (req, res) => {
  const { message, leadData, emailData } = req.body;

  // Simulación de respuesta del bot
  let responseText = "🌞 ¡Hola! Soy Alejandro iA, tu asistente solar emocional. ¿En qué sistema estás interesado?";

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
  console.log(`Server running on port ${PORT}`);
});
