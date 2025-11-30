import express from 'express';
import { OpenAI } from 'openai';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static('public'));
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: message
    });

    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: ASSISTANT_ID,
    }, {
      pollIntervalMs: 700,
      timeoutMs: 90000
    });

    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId);
      const assistantReply = messages.data[0].content[0].text.value;
      res.json({ reply: assistantReply });
    } else {
      res.json({ reply: "Tardé un poquito más de lo normal… ¿me repites la pregunta por favor?" });
    }

  } catch (error) {
    console.error("Error:", error.message);
    res.json({ reply: "Error temporal. Intenta de nuevo en segundos." });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Alejandro AI corriendo en puerto ${PORT}`);
});
