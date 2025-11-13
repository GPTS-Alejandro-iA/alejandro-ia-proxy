import express from "express";
import fetch from "node-fetch";
import OpenAI from "openai";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

// === 🔑 CONFIGURACIÓN PRINCIPAL ===
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const ASSISTANT_ID = process.env.ASSISTANT_ID || "asst_fUNT2sPlWS7LYmNqrU9uHKoU";

app.get("/", (req, res) => {
  res.send("✅ Alejandro iA WebChat está activo y corriendo correctamente.");
});

// === 💬 ENDPOINT DE CHAT ===
app.post("/chat", async (req, res) => {
  try {
    const { message, userId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Mensaje vacío." });
    }

    // 🧠 Mantener un hilo por usuario (conversación persistente)
    const threadKey = `thread_${userId || "default"}`;
    if (!global[threadKey]) {
      const thread = await openai.beta.threads.create();
      global[threadKey] = thread.id;
      console.log(`🧵 Nuevo hilo creado para usuario ${userId || "default"} (${thread.id})`);
    }

    const threadId = global[threadKey];

    // 🗣 Agregar mensaje del usuario
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    // ▶️ Ejecutar el asistente
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
    });

    // Esperar hasta que finalice la ejecución
    let runStatus;
    do {
      await new Promise((r) => setTimeout(r, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    } while (runStatus.status !== "completed" && runStatus.status !== "failed");

    if (runStatus.status === "failed") {
      console.error("❌ El asistente falló en generar respuesta.");
      return res.json({
        reply: "Ups, hubo un pequeño error al procesar tu solicitud. ¿Podrías repetir tu pregunta?",
      });
    }

    // 📩 Obtener último mensaje de Alejandro iA
    const messages = await openai.beta.threads.messages.list(threadId);
    const reply =
      messages.data[0]?.content?.[0]?.text?.value ||
      "Lo siento, no pude generar una respuesta en este momento.";

    // 🧲 CAPTURA AUTOMÁTICA DE LEADS (nombre, teléfono, email)
    const nameMatch = message.match(
      /(soy|me llamo|nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/i
    );
    const phoneMatch = message.match(/\+?\d{7,15}/);
    const emailMatch = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i);

    if (nameMatch || phoneMatch || emailMatch) {
      console.log(`📬 Nuevo lead detectado: ${nameMatch ? nameMatch[2] : "Cliente"} `);

      try {
        const hubspotRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HUBSPOT_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: {
              firstname: nameMatch ? nameMatch[2] : "Cliente",
              phone: phoneMatch ? phoneMatch[0] : "",
              email: emailMatch ? emailMatch[0] : `${Date.now()}@temporal.com`,
              lifecyclestage: "lead",
              source: "Chat Alejandro iA Web",
            },
          }),
        });

        const result = await hubspotRes.json();
        console.log("✅ Lead enviado a HubSpot:", result);
      } catch (hubError) {
        console.error("⚠️ Error al enviar lead a HubSpot:", hubError.message);
      }
    }

    res.json({ reply });
  } catch (error) {
    console.error("❌ Error general en /chat:", error.message);
    res.status(500).json({
      reply:
        "Parece que hay un pequeño problema técnico. Estoy aquí, solo necesito un momento para recuperar la conexión. 😊",
    });
  }
});

// === 🚀 INICIAR SERVIDOR ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌞 Alejandro iA WebChat corriendo en puerto ${PORT}`);
});
