import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Routes (Placeholders as most logic is client-side with Firestore, 
  // but fulfilling the requested FastAPI-style endpoints)
  
  app.post("/api/assistant", async (req, res) => {
    try {
      const { messages, image, intermediaries, suppliers, catalog } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ 
          text: "El asistente está funcionando en modo local porque no se ha detectado una clave API (GEMINI_API_KEY) en las variables de entorno. Por favor, configure su clave en las variables de entorno del servidor para disfrutar del análisis inteligente de imágenes y registros." 
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Structure chat messages correctly for @google/genai contents list
      let contents: any[] = [];
      if (messages && messages.length > 0) {
        contents = messages.map((m: any) => ({
          role: m.role,
          parts: m.parts || [{ text: m.text }]
        }));
      }

      // If an image is uploaded in this turn, attach it as part of the last user prompt
      if (image && image.data && image.mimeType) {
        const imagePart = {
          inlineData: {
            mimeType: image.mimeType,
            data: image.data.split(",")[1] || image.data, // Strip the header if preset
          }
        };

        const lastIndex = contents.length - 1;
        if (lastIndex >= 0 && contents[lastIndex].role === 'user') {
          contents[lastIndex].parts.push(imagePart);
        } else {
          contents.push({
            role: 'user',
            parts: [{ text: "Analiza y extrae la información de esta transacción." }, imagePart]
          });
        }
      }

      const systemInstruction = `Eres un asistente experto para este sistema financiero llamado Control Financiero. Tu objetivo es ayudar al usuario a registrar transacciones, productos digitales y ver balances.

REGLA CRÍTICA PRIMORDIAL DE NO-ASUNCIÓN (MUY IMPORTANTE):
- Si en la imagen, captura o texto de chat compartida NO se muestra, menciona ni se hace referencia explícita al nombre o existencia de un proveedor, revendedor, distribuidor, intermediario o cliente final, el sistema NO DEBE asumir ningún nombre automáticamente.
- No debes inventar, suponer, ni asumir nombres ni de ejemplo para 'finalClientName', 'warehouse', 'intermediaryId', 'supplierId' o 'supplierName'.
- En caso de que no lo indique la captura, pon estrictamente una cadena de texto vacía ("") para esos campos.
- NUNCA crees o asignes valores automáticamente a menos que estén claramente visibles o escritos en el archivo adjunto.

¡TIENES DOS SÚPER PODERES INCREÍBLES!:
1. PROCESAR IMÁGENES/CAPTURAS DE ACTUALIZACIONES ANT:
   - Extraer: Cliente Final ("finalClientName"), Bodega/Establecimiento ("warehouse") y asociarlo con la lista de Distribuidores.
2. PROCESAR IMÁGENES/CHAT CON PROVEEDORES DE CUENTAS DIGITALES (Netflix, Disney+, etc.):
   - Puedes analizar capturas de chats, mensajes de WhatsApp o recibos con proveedores que te entregan cuentas activadas.
   - Extraerás los datos claves:
     * Nombre del Producto / Servicio (ej. Netflix 1 Pantalla, Disney+, Max)
     * Correo electrónico de la cuenta ("email")
     * Contraseña ("password")
     * PIN o perfil registrado ("pin")
     * Fecha de vencimiento ("expirationDate" en formato YYYY-MM-DD. Si se indica "30 días" o similar, calcúlala sumando 30 días a la fecha de hoy, que es 2026-05-23)
     * Costo del proveedor ("cost")
     * Precio sugerido o real de venta ("revenue" / precio de venta)
     * Nombre e ID del Proveedor ("supplierId" y "supplierName")
     * Número de teléfono, celular o contacto del cliente si se menciona o se ve en la captura ("clientContact")

CONTEXTO DEL USUARIO:
- Distribuidores/Intermediarios de ANT: ${JSON.stringify(intermediaries || [], null, 2)}
- Proveedores de Cuentas Digitales: ${JSON.stringify(suppliers || [], null, 2)}
- Catálogo de Servicios Digitales del usuario: ${JSON.stringify(catalog || [], null, 2)}

INSTRUCCIÓN DE TRABAJO:
Si es un caso de Actualización ANT:
- Presenta qué datos lograste extraer (Socio Comercial, Bodega).
- DEBES incluir al final un bloque \`\`\`json-action con el formato exacto. Si no se puede extraer con certeza, pon "":
\`\`\`json-action
{
  "type": "add_transaction",
  "finalClientName": "NOMBRE_CLIENTE_EXTRAIDO_O_VACIO",
  "warehouse": "BODEGA_O_ESTABLECIMIENTO_EXTRAIDA_O_VACIO",
  "intermediaryId": "ID_INTERMEDIARIO_EXTRAIDO_O_VACIO"
}
\`\`\`

Si es un caso de Venta de Cuenta/Servicio Digital (de proveedor o chat de entrega):
- Indica amablemente que has detectado una cuenta digital y enumera los campos extraídos: Producto, Correo, Clave, PIN, Fecha de Vencimiento, Costo, y Venta.
- Intenta emparejar el producto con la lista del 'Catálogo' suministrado. Si coincide, usa ese nombre exacto de producto, su costo y su precio de venta sugerido.
- Intenta emparejar el proveedor con la lista de 'Proveedores' (por nombre o aproximación).
- DEBES incluir al final un bloque \`\`\`json-action con el siguiente formato EXACTO, calculando la fecha de vencimiento adecuadamente si es relativa (la fecha actual es 2026-05-23):
\`\`\`json-action
{
  "type": "add_digital_service",
  "name": "NOMBRE_DEL_PRODUCTO_SOCIADO_O_CONFIGURADO",
  "email": "CORREO_EXTRAIDO_O_VACIO",
  "password": "CONTRASEÑA_EXTRAIDA_O_VACIO",
  "pin": "PIN_O_PERFIL_EXTRAIDO_O_VACIO",
  "expirationDate": "YYYY-MM-DD_FECHA_EXTRAIDA_O_CALCULADA",
  "cost": COSTO_NUMERICO_EXTRAIDO_O_POR_CATALOGO,
  "revenue": INGRESO_VENTA_NUMERICO_O_POR_CATALOGO,
  "supplierId": "ID_PROVEEDOR_COINCIDENTE_O_VACIO",
  "supplierName": "NOMBRE_PROVEEDOR_COINCIDENTE_O_VACIO",
  "clientContact": "NUMERO_TELEFONO_CLIENTE_O_VACIO"
}
\`\`\`

IMPORTANTE: El bloque JSON-action debe estructurarse de forma impecable sin errores de formato para que no falle la integración. Saboriza tu respuesta con un tono profesional, claro, empático y estructurado en español fluido.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1, // low temperature to ensure highly deterministic format extraction
        },
        contents: contents
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
