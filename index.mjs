import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch'; // O axios si prefieres
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// Ruta principal de prueba
app.get('/', (req, res) => res.sendFile(`${process.cwd()}/public/index.html`));

// Ruta para manejar mensajes del chat
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ reply: "No se recibió mensaje." });

  try {
    // Aquí llamas a la API de OpenAI con tu ASSISTANT_ID
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistant: process.env.ASSISTANT_ID,
        input: message
      })
    });

    const data = await response.json();
    let reply = data.output?.[0]?.content?.[0]?.text || "Lo siento, hubo un error al responder.";

    // Aquí podrías verificar si el usuario ya envió nombre/teléfono y disparar send_lead
    // y luego send_email según tu Prompt Maestro

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.json({ reply: "Lo siento, ocurrió un error en el servidor." });
  }
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
