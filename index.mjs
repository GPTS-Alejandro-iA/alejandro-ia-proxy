// index.mjs — Servidor proxy de Alejandro iA
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = "asst_fUNT2sPlWS7LYmNqrU9uHKoU";

// Endpoint principal del chat
app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Falta el mensaje del usuario." });
    }

    // Llamada al API de OpenAI para usar tu asistente Alejandro iA
    const response = await fetch(`https://api.openai.com/v1/assistants/${ASSISTANT_ID}/responses`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: message
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Error en respuesta de OpenAI:", errorData);
      return res.status(500).json({ error: "Error al conectar con Alejandro iA." });
    }

    const data = await response.json();

    // Maneja salida según formato de API
    const output = data.output_text || data.output || "Disculpa, tuve un problema técnico.";

    console.log("💬 Cliente:", message);
    console.log("🤖 Alejandro iA:", output);

    res.json({ reply: output });
  } catch (error) {
    console.error("Error interno del servidor:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// Endpoint simple para verificar si el servidor corre
app.get("/", (req, res) => {
  res.send("🚀 Alejandro iA está corriendo correctamente en Render.");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor de Alejandro iA corriendo en puerto ${PORT}`));
