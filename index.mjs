import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import OpenAI from "openai";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

// =========================
// CONFIG
// =========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// OpenAI Assistant
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = process.env.ASSISTANT_ID;

// HubSpot
const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;

// Gmail
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_PASS },
});

// =========================
// SESIONES
// =========================
const sessions = {}; // sessionId => threadId

// =========================
// TOOLS
// =========================
async function sendLeadToHubSpot(data) {
  if (!HUBSPOT_TOKEN) return console.log("Falta HUBSPOT_TOKEN");
  const [firstname, ...rest] = data.name.split(" ");
  const lastname = rest.join(" ") || "";

  await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        firstname,
        lastname,
        phone: data.phone,
        email: data.email || "",
        address: data.address || "",
        preferred_contact_time: data.preferred_time || "",
        lead_source: "Chat Alejandro AI",
      },
    }),
  });
}

async function sendProposalEmail({ to, subject, text }) {
  await transporter.sendMail({
    from: `"Alejandro - Green Power Tech Store" <${GMAIL_USER}>`,
    to,
    subject,
    text,
    html: text.replace(/\n/g, "<br>"),
  });
  console.log(`Cotización enviada a ${to}`);
}

// =========================
// FRONTEND
// =========================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// =========================
// CHAT ENDPOINT
// =========================
app.post("/chat", async (req, res) => {
  const { message, sessionId, tool_calls } = req.body;

  // Ejecutar herramientas si vienen
  if (tool_calls) {
    for (const call of tool_calls) {
      const args = JSON.parse(call.arguments || "{}");
      if (call.name === "send_lead") await sendLeadToHubSpot(args);
      if (call.name === "send_email") await sendProposalEmail(args);
    }
  }

  try {
    if (!sessions[sessionId]) {
      const thread = await client.beta.threads.create();
      sessions[sessionId] = thread.id;
    }

    const threadId = sessions[sessionId];

    // Añadir mensaje del usuario
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    // Crear run de assistant
    const run = await client.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID,
    });

    // Esperar respuesta
    let status = run.status;
    let aiText = "Alejandro iA no pudo responder.";

    while (status === "in_progress" || status === "queued") {
      await new Promise(r => setTimeout(r, 800));
      const check = await client.beta.threads.runs.retrieve(threadId, run.id);
      status = check.status;
      if (check.status === "completed") {
        const allMessages = await client.beta.threads.messages.list(threadId);
        const lastBot = allMessages.data.reverse().find(m => m.role === "assistant");
        aiText = lastBot?.content[0]?.text?.value || aiText;
        break;
      }
    }

    res.json({ reply: aiText });

  } catch (err) {
    console.error(err);
    res.json({ reply: "Error en el servidor." });
  }
});

// =========================
// INICIAR SERVIDOR
// =========================
app.listen(PORT, () => {
  console.log(`🔥 Alejandro AI corriendo en puerto ${PORT}`);
});
