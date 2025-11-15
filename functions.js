import nodemailer from "nodemailer";
import fetch from "node-fetch"; // Para llamadas a HubSpot API
import dotenv from "dotenv";
dotenv.config();

// Función para enviar lead a HubSpot
export async function send_lead({ name, email = "", phone, bestTime = "", address = "" }) {
  try {
    const hubspotApiKey = process.env.HUBSPOT_API_KEY;
    const url = `https://api.hubapi.com/crm/v3/objects/contacts`;

    const body = {
      properties: {
        firstname: name.split(" ")[0],
        lastname: name.split(" ").slice(1).join(" "),
        email: email || "",
        phone: phone || "",
        address: address || "",
        best_time_to_call: bestTime || ""
      }
    };

    const response = await fetch(`${url}?hapikey=${hubspotApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HubSpot API error: ${text}`);
    }

    const data = await response.json();
    console.log("Lead enviado a HubSpot:", data);
    return { status: "lead_sent", data };
  } catch (err) {
    console.error("Error enviando lead a HubSpot:", err);
    throw new Error(err.message);
  }
}

// Función para enviar email
export async function send_email({ to, subject, text }) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Green Power Tech Store" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });

    console.log("Correo enviado:", info.messageId);
    return { status: "email_sent", messageId: info.messageId };
  } catch (err) {
    throw new Error("Error enviando email: " + err.message);
  }
}

