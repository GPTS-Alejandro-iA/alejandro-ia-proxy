import express from "express";
import fetch from "node-fetch";
import OpenAI from "openai";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

// Inicializa cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// URL del endpoint de HubSpot
const HUBSPOT_API_URL = "https://api.hubapi.com/crm/v3/objects/contacts";
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// ✅ Función para crear o actualizar un contacto en HubSpot
async function sendLeadToHubSpot({ name, email, message }) {
  try {
    const res = await fetch(HUBSPOT_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          email: email || `prospecto_${Date.now()}@example.com`,
          firstname: name || "Cliente",
          message: message || "Sin mensaje",
          lead_source: "Chat Web Alejandro iA",
        },
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log("✅ Prospecto enviado a HubSpot:", data.id || data);
    } else {
      console.error("❌ Error al enviar a HubSpot:", data);
    }
  } catch (err) {
    console.error("❌ Error en la conexión con HubSpot:", err.message);
  }
}

// ✅ Ruta principal
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// ✅ Ruta de chat
app.post("/chat", async (req, res) => {
  const { message, name, email } = req.body;

  try {
    // Envía el mensaje a tu Assistant específico
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Eres Alejandro iA, asesor solar inteligente de Green Power Tech Store.
Hablas con clientes que desean sistemas solares, backup de energía o financiamiento.
Responde siempre de forma profesional, amable, resumida y útil.
`,
        },
        { role: "user", content: message },
      ],
      temperature: 0.8,
    });

    const aiMessage = response.choices[0].message.content.trim();

    // Enviar los datos del cliente a HubSpot
    await sendLeadToHubSpot({ name, email, message });

    res.json({ reply: aiMessage });
  } catch (error) {
    console.error("❌ Error en /chat:", error);
    res.status(500).json({ error: "Ocurrió un error al procesar tu mensaje." });
  }
});

// Inicia el servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`🌞 WebChat de Alejandro iA activo en puerto ${PORT}`)
);
