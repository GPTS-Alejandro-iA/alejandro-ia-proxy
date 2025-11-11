// index.mjs
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import fetch from "node-fetch"; // solo si necesitas llamar HubSpot con fetch

dotenv.config();
const app = express();
app.use(cors()); // permite llamadas desde tu Shopify (orígenes)
app.use(express.json({ limit: "200kb" }));

const PORT = process.env.PORT || 10000;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";
const ASSISTANT_ID = process.env.ASSISTANT_ID || ""; // opcional

if (!OPENAI_KEY) {
  console.error("❌ Falta OPENAI_API_KEY en env");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_KEY });

/**
 * UTIL: prompt maestro (puedes reemplazar por usar ASSISTANT_ID flow)
 * Si usas Assistant ID, verás abajo la alternativa breve.
 */
const PROMPT_MAESTRO = (extra = "") => `
PROMPT MAESTRO — ALEJANDRO iA | GREEN POWER TECH STORE
${extra}
`;

/**
 * Endpoint principal: enviar mensaje -> devuelve respuesta de Alejandro iA
 * Body esperado: { message: "..." , name: "...", phone: "..." }
 */
app.post("/chat", async (req, res) => {
  try {
    const { message, metadata } = req.body;
    if (!message || typeof message !== "string") return res.status(400).json({ error: "Campo 'message' requerido" });

    // --- Opción A: usar completions/chat completions con PROMPT MAESTRO ---
    const messages = [
      { role: "system", content: PROMPT_MAESTRO() },
      { role: "user", content: message }
    ];

    // Llamada a OpenAI (Chat Completions)
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      max_tokens: 700
    });

    const reply = completion.choices?.[0]?.message?.content?.trim() ?? "Lo siento, no obtuve respuesta.";

    // --- Opcional: mandar lead / conversación a HubSpot o webhook ---
    if (process.env.HUBSPOT_WEBHOOK_URL) {
      // ejemplo simple: envía payload con mensaje, reply y metadata
      fetch(process.env.HUBSPOT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, reply, metadata, ts: Date.now() })
      }).catch((e) => console.warn("⚠️ HubSpot webhook error:", e.message));
    }

    return res.json({ reply });
  } catch (error) {
    console.error("Error /chat:", error?.message ?? error);
    return res.status(500).json({ error: "Error interno" });
  }
});

/**
 * ALTERNATIVA: Si quieres usar tu Assistant ID (la API de Assistants),
 * reemplaza la llamada anterior por un POST a:
 * POST https://api.openai.com/v1/assistants/{ASSISTANT_ID}/sessions
 * y luego enviar mensajes. (Si quieres, te doy el snippet exacto).
 */

app.get("/", (_, res) => res.send("Alejandro iA - proxy ok"));
app.listen(PORT, () => console.log(`🚀 Proxy corriendo en puerto ${PORT}`));
