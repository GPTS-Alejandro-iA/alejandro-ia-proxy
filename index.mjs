import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import { send_lead, send_email } from "./functions.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: path.join(__dirname, "public") });
});

app.post("/chat", async (req, res) => {
  const { message, leadData, emailData } = req.body;

  let responseText = "🌞 ¡Hola! Soy Alejandro iA, tu asistente solar emocional. ¿En qué sistema estás interesado?";

  if (leadData?.name && leadData?.phone) {
    await send_lead(leadData);
  }

  if (emailData?.to && emailData?.subject && emailData?.text) {
    await send_email(emailData);
  }

  res.json({ reply: responseText });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
