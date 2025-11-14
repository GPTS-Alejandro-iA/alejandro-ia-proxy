import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== OPENAI CLIENT =====
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== SERVE CHAT UI =====
app.get("/chat-ui", (req, res) => {
  res.sendFile(path.join(__dirname, "chat.html"));
});

app.get("/", (req, res) => {
  res.send("Servidor activo. Entra a /chat-ui");
});

// ========== MAIN CHAT ENDPOINT ==========
app.post("/chat", async (req, res) => {
  try {
    const { message, threadId } = req.body;

    let finalThreadId = threadId;

    // Create a thread if none exists
    if (!finalThreadId) {
      const thread = await client.beta.threads.create();
      finalThreadId = thread.id;
    }

    // Add user message to thread
    await client.beta.threads.messages.create(finalThreadId, {
      role: "user",
      content: message
    });

    // Run the assistant
    const run = await client.beta.threads.runs.create(finalThreadId, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID
    });

    // Wait until the assistant completes the run
    let runStatus = await client.beta.threads.runs.retrieve(finalThreadId, run.id);

    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      runStatus = await client.beta.threads.runs.retrieve(finalThreadId, run.id);
    }

    // If assistant is calling a function
    if (runStatus.required_action?.type === "submit_tool_outputs") {
      const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;

      const toolOutputs = [];

      for (const call of toolCalls) {
        const fnName = call.function.name;
        const args = JSON.parse(call.function.arguments);

        console.log("🛠 Ejecutando función:", fnName, args);

        if (fnName === "send_lead") {
          await sendLeadToHubSpot(args);
          toolOutputs.push({
            tool_call_id: call.id,
            output: JSON.stringify({ ok: true })
          });
        }

        if (fnName === "send_email") {
          await sendEmailToClient(args);
          toolOutputs.push({
            tool_call_id: call.id,
            output: JSON.stringify({ ok: true })
          });
        }
      }

      // Send results back
      await client.beta.threads.runs.submitToolOutputs(
        finalThreadId,
        run.id,
        { tool_outputs: toolOutputs }
      );

      // Retrieve assistant final message
      const messages = await client.beta.threads.messages.list(finalThreadId);
      const lastAssistantMessage = messages.data.find(m => m.role === "assistant");

      return res.json({
        threadId: finalThreadId,
        reply: lastAssistantMessage.content[0].text.value
      });
    }

    // Normal assistant message (no functions)
    const messages = await client.beta.threads.messages.list(finalThreadId);
    const lastAssistantMessage = messages.data.find(m => m.role === "assistant");

    return res.json({
      threadId: finalThreadId,
      reply: lastAssistantMessage.content[0].text.value
    });

  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ====== HUBSPOT FUNCTION ======
async function sendLeadToHubSpot({ name, email, phone, message }) {
  const url = "https://api.hubapi.com/crm/v3/objects/contacts";

  const payload = {
    properties: {
      email,
      firstname: name || "",
      phone: phone || "",
      message: message || ""
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  console.log("HubSpot status:", response.status);
}

// ===== EMAIL FUNCTION =====
import nodemailer from "nodemailer";

async function sendEmailToClient({ to, subject, text }) {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_EMAIL,
    to,
    subject,
    text
  });

  console.log("📨 Email enviado a:", to);
}

app.listen(3000, () => console.log("Servidor corriendo en el puerto 3000"));
