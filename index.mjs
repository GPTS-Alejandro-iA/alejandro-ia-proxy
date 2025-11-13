import express from "express";
import fetch from "node-fetch";
import OpenAI from "openai";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const ASSISTANT_ID = "asst_fUNT2sPlWS7LYmNqrU9uHKoU"; // Tu asistente GPT-4.1

// === 💾 Estado de usuarios en memoria ===
const userSessions = {}; // { userId: { threadId, formCompleted, leadCreated } }

// === 🌞 Ruta principal ===
app.get("/", (req, res) => {
  res.send("✅ Alejandro iA WebChat activo y conectado con HubSpot.");
});

// === 💬 Chat endpoint ===
app.post("/chat", async (req, res) => {
  try {
    const { message, userId } = req.body;
    if (!message || !userId)
      return res.status(400).json({ error: "Faltan datos: message o userId." });

    // 🔄 Inicializar sesión si no existe
    if (!userSessions[userId]) {
      const thread = await openai.beta.threads.create();
      userSessions[userId] = {
        threadId: thread.id,
        formCompleted: false,
        leadCreated: false,
      };
    }

    const session = userSessions[userId];

    // === 🧠 Crear mensaje del usuario ===
    await openai.beta.threads.messages.create(session.threadId, {
      role: "user",
      content: message,
    });

    // === 🚀 Ejecutar el asistente GPT-4.1 ===
    const run = await openai.beta.threads.runs.create(session.threadId, {
      assistant_id: ASSISTANT_ID,
    });

    // Esperar finalización
    let runStatus;
    do {
      await new Promise((r) => setTimeout(r, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(
        session.threadId,
        run.id
      );
    } while (runStatus.status !== "completed");

    const messages = await openai.beta.threads.messages.list(session.threadId);
    const reply =
      messages.data[0]?.content?.[0]?.text?.value ||
      "No hubo respuesta del asistente.";

    // === 🧲 Detección de datos del lead ===
    const nameMatch = message.match(
      /(soy|me llamo|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/i
    );
    const phoneMatch = message.match(/\+?\d{7,15}/);
    const addressMatch = message.match(/calle|avenida|urb\.|sector|#|google/i);

    if (!session.leadCreated && nameMatch && phoneMatch) {
      session.formCompleted = true;

      const name = nameMatch ? nameMatch[2] : "Cliente sin nombre";
      const phone = phoneMatch ? phoneMatch[0] : "";
      const address = addressMatch ? message : "";

      console.log(`📬 Lead completado por ${name} (${phone})`);

      await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HUBSPOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            firstname: name,
            phone,
            address,
            lifecyclestage: "lead",
            source: "Chat Alejandro iA Web",
          },
        }),
      });

      session.leadCreated = true;
    }

    // === ⚙️ Control de flujo del formulario ===
    let adjustedReply = reply;

    if (!session.formCompleted) {
      adjustedReply =
        "👋 Para continuar con la orientación necesitamos que me compartas tu **nombre completo y número de teléfono**. " +
        "Una vez tenga esos datos puedo seguir con la orientación y cotización personalizada.";
    }

    res.json({ reply: adjustedReply });
  } catch (error) {
    console.error("❌ Error en /chat:", error);
    res.status(500).json({ error: "Error interno del servidor", details: error.message });
  }
});

// === 🚀 Iniciar servidor ===
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌞 Alejandro iA WebChat activo en puerto ${PORT}`);
});
