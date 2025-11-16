import express from "express";
import bodyParser from "body-parser";
import { send_lead, send_email } from "./functions.js";
import OpenAI from "openai";

const app = express();
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    // ====== LLAMADA AL ASSISTANT ======
    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: [{ role: "user", content: userMessage }],
    });

    let assistantReply = response.output_text; // Texto del Assistant

    // ====== DETECTAR TOOL ======
    const toolRegex = /{.*"tool".*}/;
    const match = assistantReply.match(toolRegex);

    if (match) {
      const toolData = JSON.parse(match[0]);
      if (toolData.tool === "send_lead") {
        await send_lead(toolData.arguments);
      } else if (toolData.tool === "send_email") {
        await send_email(toolData.arguments);
      }
      // Remover el JSON del mensaje final que se envía al cliente
      assistantReply = assistantReply.replace(toolRegex, "").trim();
    }

    res.json({ reply: assistantReply });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error processing message" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
