// index.mjs
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { send_lead, send_email } from "./functions.js";

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ruta raíz para probar
app.get("/", (req, res) => {
  res.send("Servidor de Alejandro iA corriendo ✅");
});

// Ruta para recibir leads
app.post("/lead", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    // Enviar a HubSpot
    await send_lead({ name, email, phone, message });

    // Enviar correo
    await send_email({ name, email, phone, message });

    res.status(200).json({ status: "ok", message: "Lead procesado correctamente" });
  } catch (error) {
    console.error("Error procesando lead:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
