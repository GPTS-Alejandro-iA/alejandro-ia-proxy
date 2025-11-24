import express from "express";
import OpenAI from "openai";
import fetch from "node-fetch";
import nodemailer from "nodemailer";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === APP ===
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

// === OPENAI CLIENT ===
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === TOOLS ===
const toolsDefinition = [
  {
    type: "function",
    function: {
      name: "send_lead",
      description: "Envía un lead a HubSpot CRM",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          address: { type: "string" },
          preferred_time: { type: "string" },
        },
        required: ["name", "phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Envía cotización formal por email",
      parameters: {
        type: "object",
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          text: { type: "string" },
        },
        required: ["to", "subject", "text"],
      },
    },
  },
];

// === HUBSPOT AND EMAIL ===
async function sendLead(args) {
  console.log("➡️ Enviando lead:", args);

  if (!process.env.HUBSPOT_TOKEN) {
    console.log("❌ No hay HUBSPOT_TOKEN");
    return;
  }

  await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        firstname: args.name,
        phone: args.phone,
        email: args.email || "",
        address: args.address || "",
        preferred_contact_time: args.preferred_time || "",
        lead_source: "Chat Alejandro AI",
      },
    }),
  });
}

async function sendEmail(args) {
  console.log("➡️ Enviando email:", args);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Alejandro - Green Power Tech Store" <${process.env.GMAIL_USER}>`,
    to: args.to,
    subject: args.subject,
    html: args.text.replace(/\n/g, "<br>"),
  });
}

// === CHAT ROUTE ===
app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.json({ reply: "No recibí mensaje." });
    }

    // 1. Crear thread si no existe
    if (!global.threads) global.threads = {};
    if (!global.threads[sessionId]) {
      const thread = await client.beta.threads.create();
      global.threads[sessionId] = thread.id;
    }

    const threadId = global.threads[sessionId];

    // 2. Enviar mensaje al thread
    await client.beta.threads.messages.create(threadId, {
      role: "user",
      content: message,
    });

    // 3. Crear RUN
    let run = await client.beta.threads.runs.create(threadId, {
      assistant_id: process.env.ASSISTANT_ID,
      tools: toolsDefinition,
    });

    // 4. Esperar run
    let status = run.status;
    while (status === "in_progress" || status === "queued") {
      await new Promise(res => setTimeout(res, 1000));
      run = await client.beta.threads.runs.retrieve(threadId, run.id);
      status = run.status;
    }

    // === Si el assistant llama a tools ===
    if (run.required_action?.submit_tool_outputs) {
      const outputs = [];

      for (const call of run.required_action.submit_tool_outputs.tool_calls) {
        const args = JSON.parse(call.function.arguments);

        if (call.function.name === "send_lead") {
          await sendLead(args);
          outputs.push({
            tool_call_id: call.id,
            output: "Lead enviado a HubSpot",
          });
        }

        if (call.function.name === "send_email") {
          await sendEmail(args);
          outputs.push({
            tool_call_id: call.id,
            output: "Email enviado correctamente",
          });
        }
      }

      // Responder herramientas
      await client.beta.threads.runs.submitToolOutputs(threadId, run.id, {
        tool_outputs: outputs,
      });

      // Volver a esperar
      run = await client.beta.threads.runs.retrieve(threadId, run.id);
    }

    // === Obtener última respuesta del assistant ===
    const messages = await client.beta.threads.messages.list(threadId);
    const last = messages.data[0].content[0].text.value;

    res.json({ reply: last });

  } catch (err) {
    console.error("❌ ERROR EN /chat:", err);
    res.json({ reply: "Hubo un error procesando tu solicitud." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✔ Alejandro AI en puerto " + PORT));
