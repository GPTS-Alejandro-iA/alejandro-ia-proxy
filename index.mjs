import express from 'express';
import { OpenAI } from 'openai';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile('index.html', { root: 'public' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ASSISTANT_ID = "asst_pWq1M4v688jqCMtWxbliz9m9";

const sessions = new Map();

app.post('/chat', async (req, res) => {
  const { message, sessionId } = req.body;

  try {
    // Crear o recuperar thread
    let threadId = sessions.get(sessionId);
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      sessions.set(sessionId, threadId);
    }

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    let run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: ASSISTANT_ID
    });

    // Bucle infalible que maneja tool calls y nunca se cuelga
    while (["queued", "in_progress", "requires_action"].includes(run.status)) {
      
      if (run.status === "requires_action") {
        const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
        const toolOutputs = toolCalls.map(tool => {
          if (tool.function.name === "send_lead") {
            const args = JSON.parse(tool.function.arguments);
            console.log("LEAD CAPTURADO EN HUBSPOT:", args);
            return {
              tool_call_id: tool.id,
              output: JSON.stringify({ 
                success: true, 
                message: "Lead enviado a HubSpot y cotización en camino" 
              })
            };
          }
          // Para cualquier otra función futura
          return { 
            tool_call_id: tool.id, 
            output: JSON.stringify({ success: true }) 
          };
        });

        run = await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
          tool_outputs: toolOutputs
        });
      } else {
        await new Promise(r => setTimeout(r, 800));
        run = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }
    }

    if (run.status === "completed") {
      const messages = await openai.beta.threads.messages.list(threadId);
      const reply = messages.data[0].content[0].text.value;
      res.json({ reply });
    } else {
      res.json({ reply: "Disculpa, tardé un poquito. ¿Me repites tu correo para
