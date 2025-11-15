import HubspotClient from "@hubspot/api-client";
import nodemailer from "nodemailer";

const hubspotClient = new HubspotClient({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

// Función para enviar Lead a HubSpot
export async function send_lead({ name, email, phone, bestTime, address, message }) {
  const [firstname, ...rest] = name.split(" ");
  const lastname = rest.join(" ") || " ";
  const emailFinal = email || `${firstname.toLowerCase()}.${lastname.toLowerCase()}@noemail.com`;

  try {
    const response = await hubspotClient.crm.contacts.basicApi.create({
      properties: {
        firstname,
        lastname,
        email: emailFinal,
        phone: phone || "",
        notes: message || "",
        best_time: bestTime || "",
        address: address || ""
      }
    });
    console.log("Lead enviado correctamente a HubSpot:", response.body);
    return { success: true };
  } catch (error) {
    console.error("Error enviando lead a HubSpot:", error.message);
    return { success: false, error: error.message };
  }
}

// Función para enviar correo al cliente
export async function send_email({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `"Green Power Tech Store" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text
    });
    console.log("Correo enviado correctamente:", info.messageId);
    return { success: true };
  } catch (error) {
    console.error("Error enviando correo:", error.message);
    return { success: false, error: error.message };
  }
}
