import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 10000;

// Configura CORS para permitir conexión desde tu dominio de Shopify
app.use(cors());
app.use(bodyParser.json());

// Inicializa cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID, // opcional
});

// Página principal
app.get("/", (req, res) => {
  res.send(`
    <h1>🤖 Alejandro iA - Chatbot Web</h1>
    <p>Endpoint operativo: <a href="/chat">/chat</a></p>
  `);
});

// Endpoint del chat
app.post("/chat", async (req, res) => {
  try {
    const { message, thread_id } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Falta el campo 'message'" });
    }

    // Crea o continúa un hilo con el asistente
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: "Eres Alejandro iA, un asesor experto en energía solar y atención al cliente de Green Power Tech Store." },
        { role: "user", content: message }
      ]
    });

    const reply = response.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.error("Error en /chat:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Inicia servidor
app.listen(port, () => {
  console.log(`🚀 Servidor de Alejandro iA corriendo en puerto ${port}`);
});
