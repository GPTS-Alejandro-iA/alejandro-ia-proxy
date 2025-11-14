import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public')); // sirve index.html y demás archivos

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

// Función para enviar lead a HubSpot
async function send_lead(lead) {
  try {
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          firstname: lead.name.split(' ')[0],
          lastname: lead.name.split(' ').slice(1).join(' '),
          phone: lead.phone,
          email: lead.email || '',
          address: lead.address || '',
          notes: lead.message || '',
          best_time: lead.best_time || ''
        }
      })
    });
    return await res.json();
  } catch (e) {
    console.error('Error send_lead:', e);
  }
}

// Función para enviar correo
async function send_email(emailData) {
  try {
    const res = await fetch('https://api.your-email-service.com/send', { // reemplaza con tu servicio real
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData)
    });
    return await res.json();
  } catch (e) {
    console.error('Error send_email:', e);
  }
}

// Endpoint de chat
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;

  try {
    const response = await fetch(`https://api.openai.com/v1/assistants/${ASSISTANT_ID}/message`, {
      method: 'POST',
      headers: {
