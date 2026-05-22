import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes (Placeholders as most logic is client-side with Firestore, 
  // but fulfilling the requested FastAPI-style endpoints)
  
  app.post("/api/assistant", async (req, res) => {
    try {
      const { messages } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ 
          text: "El asistente está funcionando en modo local porque no se ha detectado una clave API (GEMINI_API_KEY) en las variables de entorno. Por favor, configure su clave en las variables de entorno del servidor." 
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'system', parts: [{ text: 'Eres un asistente experto para este sistema financiero llamado Control Financiero en español. Tu objetivo es ayudar al usuario a entender cómo registrar transacciones, manejar cuentas por cobrar, cuentas por pagar, productos digitales y ver sus balances de tesorería.' }] },
          ...messages
        ]
      });

      res.json({ text: response.text || "No obtuve una respuesta válida de Gemini." });
    } catch (e: any) {
      console.error("Gemini Error:", e);
      res.status(500).json({ error: e.message || "Error al procesar la solicitud con Gemini." });
    }
  });

  app.get("/api/users", (req, res) => {
    // In a real app, this would query entities with type=client/intermediary/supplier
    res.json({ message: "Use Firestore client to fetch users directly for real-time" });
  });

  app.get("/api/services", (req, res) => {
    res.json({ message: "Use Firestore client for services" });
  });

  app.get("/api/updates", (req, res) => {
    res.json({ message: "Use Firestore client for transactional updates" });
  });

  app.post("/api/billing/whatsapp", (req, res) => {
    const { phone, items, total } = req.body;
    // Construct structured text report for intermediaries
    // breakdown list showing: "Final Client - Warehouse - $Value"
    let text = "Financial Control - Pending Updates Report\n\n";
    items.forEach((item: any) => {
      text += `• ${item.finalClientName} - ${item.warehouse} - $${item.chargedRate.toFixed(2)}\n`;
    });
    text += `\nConsolidated Grand Total: $${total.toFixed(2)}`;
    
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    res.json({ url });
  });

  app.get("/api/reports", (req, res) => {
    res.json({ 
      summary: "Analytics Dashboard data",
      netMargin: 0,
      projections: 0,
      retention: 0
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
