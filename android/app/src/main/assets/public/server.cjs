var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.post("/api/assistant", async (req, res) => {
    try {
      const { messages } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          text: "El asistente est\xE1 funcionando en modo local porque no se ha detectado una clave API (GEMINI_API_KEY) en las variables de entorno. Por favor, configure su clave en las variables de entorno del servidor."
        });
      }
      const ai = new import_genai.GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction: "Eres un asistente experto para este sistema financiero llamado Control Financiero. Tu objetivo es ayudar al usuario a entender c\xF3mo registrar transacciones, manejar cuentas por cobrar, cuentas por pagar, productos digitales y ver sus balances. Por favor, aseg\xFArate de mantener tus respuestas bien estructuradas usando Markdown (usa listas, negritas para t\xE9rminos importantes y p\xE1rrafos cortos para facilitar la lectura). Las respuestas deben tener mucho sentido, ser precisas y no saturar al usuario con bloques largos de texto."
        },
        contents: messages
      });
      res.json({ text: response.text || "No obtuve una respuesta v\xE1lida de Gemini." });
    } catch (e) {
      console.error("Gemini Error:", e);
      res.status(500).json({ error: e.message || "Error al procesar la solicitud con Gemini." });
    }
  });
  app.get("/api/users", (req, res) => {
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
    let text = "Financial Control - Pending Updates Report\n\n";
    items.forEach((item) => {
      text += `\u2022 ${item.finalClientName} - ${item.warehouse} - $${item.chargedRate.toFixed(2)}
`;
    });
    text += `
Consolidated Grand Total: $${total.toFixed(2)}`;
    const url = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
