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
    let threadId = sessions.get(sessionId);
    if (!threadId) {
      const thread = await openai.beta.threads.create();
      threadId = thread.id;
      sessions.set(sessionId, threadId);
    }

    await openai.beta.threads.messages.create(threadId, { role: "user", content: message });

    let run = await openai.beta.threads.runs.create(threadId, { assistant_id: ASSISTANT_ID });

    while (["queued","in_progress","requires_action"].includes(run.status)) {
      if (run.status === "requires_action") {
        const toolOutputs = run.required_action.submit_tool_outputs.tool_calls.map(tool => ({
          tool_call_id: tool.id,
          output: JSON.stringify({ success: true })
        }));
        run = await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, { tool_outputs: toolOutputs });
      } else {
        await new Promise(r => setTimeout(r, 800));
        run = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }
    }

    if (run.status === "completed") {
      const messages = await openai.beta.threads.messages.list(threadId);
      res.json({ reply: messages.data[0].content[0].text.value });
    } else {
      res.json({ reply: "Lo siento, algo falló. Vamos de nuevo." });
    }
  } catch (e) {
    console.error(e);
    res.json({ reply: "Error temporal. Intenta otra vez." });
  }
});

app.listen(process.env.PORT || 10000, () => console.log("Alejandro vivo"));
