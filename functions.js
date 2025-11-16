import fetch from "node-fetch";

// Enviar lead a HubSpot
export async function send_lead({ name, phone, email, address, preferred_time }) {
  const HUBSPOT_API_KEY = process.env.HUBSPOT_API_KEY;
  const url = `https://api.hubapi.com/crm/v3/objects/contacts`;

  const body = {
    properties: {
      firstname: name.split(" ")[0] || "",
      lastname: name.split(" ").slice(1).join(" ") || "",
      phone: phone || "",
      email: email || "",
      address: address || "",
      hs_lead_status: "New",
      preferred_contact_time: preferred_time || ""
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${HUBSPOT_API_KEY}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    console.error("Error sending lead to HubSpot:", await response.text());
    return false;
  }

  const data = await response.json();
  console.log("Lead sent to HubSpot:", data);
  return data;
}

// Enviar propuesta por email
export async function send_email({ to, subject, text }) {
  const API_KEY = process.env.EMAIL_API_KEY; // tu proveedor de email
  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: "gpts.citas@gmail.com", name: "Alejandro Ai" },
      subject,
      content: [{ type: "text/plain", value: text }]
    })
  });

  if (!response.ok) {
    console.error("Error sending email:", await response.text());
    return false;
  }
  console.log("Email sent to", to);
  return true;
}
