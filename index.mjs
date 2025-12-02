import express from 'express';
import { OpenAI } from 'openai';
import cors from 'cors';
import nodemailer from 'nodemailer';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// VARIABLES DE RENDER (exactamente como las tienes)
const {
  ASSISTANT_ID,
  OPENAI_API_KEY,
  HUBSPOT_API_KEY,
  EMAIL_USER,
  EMAIL_PASS,
  COMPANY_NAME = "Green Power Tech Store",
  PORT = 10000
} = process.env;

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const sessions = new Map();

// EMAIL CON GMAIL
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  let threadId = sessions.get(sessionId) || (await openai.beta.threads.create()).id;
  sessions.set(sessionId, threadId);

  await openai.beta.threads.messages.create(threadId, { role: "user", content: message });

  let run = await openai.beta.threads.runs.create(threadId, { assistant_id: ASSISTANT_ID });

  while (["queued", "in_progress", "requires_action"].includes(run.status)) {
    if (run.status === "requires_action") {
      for (const tool of run.required_action.submit_tool_outputs.tool_calls) {
        if (tool.function.name === "send_lead") {
          const args = JSON.parse(tool.function.arguments);

          // HUBSPOT
          await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${HUBSPOT_API_KEY}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              properties: {
                firstname: args.name?.split(" ")[0] || "",
                lastname: args.name?.split(" ").slice(1).join(" ") || "",
                phone: args.phone || "",
                email: args.email || "",
                address: args.address || "",
                lifecyclestage: "lead"
              }
            })
          });

          // EMAIL AUTOMÁTICO
          if (args.email?.includes("@")) {
            await transporter.sendMail({
              from: `"Alejandro - ${COMPANY_NAME}" <${EMAIL_USER}>`,
              to: [args.email, EMAIL_USER],
              subject: `¡${args.name?.split(" ")[0] || "Cliente"}! Tu cotización solar`,
              html: `<h2>¡Hola ${args.name?.split(" ")[0] || "amigo"}!</h2>
                     <p>Gracias por contactar a <strong>${COMPANY_NAME}</strong>.</p>
                     <p>En breve te enviamos tu cotización personalizada.</p>
                     <p>¡Quedo a la orden!</p>
                     <p><strong>Alejandro</strong><br>787-699-2140</p>`
            });
          }

          console.log("LEAD + EMAIL ENVIADO:", args);
        }
      }

      const outputs = run.required_action.submit_tool_outputs.tool_calls.map(t => ({
        tool_call_id: t.id,
        output: JSON.stringify({ success: true })
      }));

      run = await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, { tool_outputs: outputs });
    } else {
      await new Promise(r => setTimeout(r, 800));
      run = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }
  }

  const messages = await openai.beta.threads.messages.list(threadId);
  const reply = messages.data[0].content[0].text.value;
  res.json({ reply });
});

app.listen(PORT, () => console.log(`${COMPANY_NAME} corriendo 100% en puerto ${PORT}`));
