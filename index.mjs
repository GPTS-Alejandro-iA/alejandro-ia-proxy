import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { send_lead, send_email } from "./functions.js";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const port = process.env.PORT || 10000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Endpoint para procesar mensajes de Alejandro iA
app.post("/chat", async (req, res) => {
  const { message, context } = req.body;

  try {
    // Llamada al modelo GPT-4.1 mini
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        ...(context || []),
        { role: "user", content: message }
      ]
    });

    const reply = response.choices[0].message.content;

    // Detectar si el reply incluye send_lead o send_email
    if (reply.includes("send_lead")) {
      const leadMatch = reply.match(/send_lead\((.*)\)/s);
      if (leadMatch) {
        const leadData = JSON.parse(leadMatch[1]);
        await send_lead(leadData);
      }
    }

    if (reply.includes("send_email")) {
      const emailMatch = reply.match(/send_email\((.*)\)/s);
      if (emailMatch) {
        const emailData = JSON.parse(emailMatch[1]);
        await send_email(emailData);
      }
    }

    res.json({ reply });

  } catch (error) {
    console.error("Error en chat:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});
