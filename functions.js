import fetch from "node-fetch";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// ================= HubSpot Lead =================
export async function send_lead({ name, email, phone, message, bestTime, address }) {
  const HUBSPOT_TOKEN = process.env.HUBSPOT_TOKEN;

  const url = "https://api.hubapi.com/crm/v3/objects/contacts";

  const body = {
    properties: {
      email: email || `${phone}@noemail.com`, // si no hay email
      firstname: name,
      phone,
      address,
      message,
      best_time_to_call: bestTime,
    },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`HubSpot API error: ${errText}`);
    }

    console.log("Lead enviado a HubSpot correctamente");
    return await resp.json();
  } catch (err) {
    console.error("Error enviando lead a HubSpot:", err);
    throw err;
  }
}

// ================= Envío de correo =================
export async function send_email({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Green Power Tech Store" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });

    console.log("Correo enviado:", info.messageId);
    return info;
  } catch (err) {
    console.error("Error enviando correo:", err);
    throw err;
  }
}
