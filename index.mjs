import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { send_lead, send_email } from "./functions.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  // Aquí llamas a tu Assistant Alejandro Ai usando OpenAI Responses API
  // Ejemplo:
  const reply = await callAlejandroAi(message);

  res.json({ reply });
});

async function callAlejandroAi(message) {
  // Implementación según tu integración actual con Responses API
  return "Respuesta simulada de Alejandro Ai: " + message;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
