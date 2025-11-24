import express from "express";
import fetch from "node-fetch";
import nodemailer from "nodemailer";

const app = express();
app.use(express.json({ limit: "10mb" }));

// === CONFIG ===
const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;
const GMAIL_USER = process.env.GMAIL_USER || "gpts.citas@gmail.com";
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_PASS },
});

// === TOOLS ===
const tools = [ /* los dos JSON que definiste: send_lead y send_email */ ];

// === ENVIAR LEAD A HUBSPOT ===
async function sendLeadToHubSpot(data) {
  if (!HUBSPOT_TOKEN) return console.log("Falta token");
  const [firstname, ...last] = data.name.split(" ");
  const lastname = last.join(" ");

  await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HUBSPOT_TOKEN}`,
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

// === ENVIAR EMAIL ===
async function sendProposalEmail({ to, subject, text }) {
  await transporter.sendMail({
    from: `"Alejandro - Green Power Tech Store" <${GMAIL_USER}>`,
    to,
    subject,
    text,
    html: text.replace(/\n/g, "<br>"),
  });
}

// === RUTA CHAT ===
app.post("/chat", async (req, res) => {
  const { messages, tool_calls } = req.body;

  // Ejecutar tools
  if (tool_calls) {
    for (const call of tool_calls) {
      if (call.name === "send_lead") {
        await sendLeadToHubSpot(JSON.parse(call.arguments));
      }
      if (call.name === "send_email") {
        await sendProposalEmail(JSON.parse(call.arguments));
      }
    }
  }

  res.json({
    response: `¡Perfecto! Ya envié tu lead a HubSpot y tu cotización al correo.\n\nEn breve te contacta el Sr. Oxor al 787-699-2140.\n\n¡Excelente día! ☀️`,
    tools,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Alejandro AI corriendo en puerto ${PORT}`));
