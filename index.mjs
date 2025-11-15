import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Chat endpoint
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  console.log('Mensaje recibido:', message);

  // Aquí iría la lógica de tu IA
  const reply = `Alejandro iA responde: "${message}"`; 
  res.json({ reply });
});

// Ejemplo de endpoint lead
app.post('/api/lead', (req, res) => {
  const lead = req.body;
  console.log('Lead recibido:', lead);
  res.json({ status: 'ok' });
});

// Ejemplo de endpoint email
app.post('/api/email', (req, res) => {
  const emailData = req.body;
  console.log('Email a enviar:', emailData);
  res.json({ status: 'sent' });
});

// Servir frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
