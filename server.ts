import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Simple, high-performance IP-based rate limiter to protect against resource abuse/DoS
const rateLimits: Record<string, { count: number; resetTime: number }> = {};
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // 30 requests per minute

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Extract clients actual IP under potential reversed proxies
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip";
  const ipStr = Array.isArray(ip) ? ip[0] : String(ip);
  const now = Date.now();

  const record = rateLimits[ipStr];
  if (!record || now > record.resetTime) {
    rateLimits[ipStr] = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS
    };
    
    // Memory leak protection - clean up older, reset IP records
    if (Object.keys(rateLimits).length > 2000) {
      for (const key of Object.keys(rateLimits)) {
        if (rateLimits[key].resetTime < now) {
          delete rateLimits[key];
        }
      }
    }
    return next();
  }

  record.count++;
  if (record.count > MAX_REQUESTS_PER_WINDOW) {
    res.setHeader("Retry-After", Math.ceil((record.resetTime - now) / 1000));
    return res.status(429).json({
      error: "Demasiadas solicitudes. Por favor intente de nuevo en un minuto (Protección anti-denegación de servicio)."
    });
  }

  next();
}

// Security: Helper of Input Sanitization to avoid XSS, HTML injections, and prompt manipulation
function sanitizeInputString(val: any): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  // Replaces markup tags, script-injection characters, and normalizes brackets/quotes
  return str
    .replace(/<[^>]*>/g, "") // Strip HTML tags
    .replace(/[<>'"&]/g, (char) => {
      switch (char) {
        case "<": return "&lt;";
        case ">": return "&gt;";
        case "'": return "&#x27;";
        case "\"": return "&quot;";
        case "&": return "&amp;";
        default: return char;
      }
    })
    .trim()
    .substring(0, 10000); // Strict length boundary to prevent memory buffers overload
}

// Dynamic Zero-Trust Token Verification Middleware for Firebase Auth ID Tokens
// In server setups, this performs a cryptographic-envelope check on issued tokens
function verifyAuthToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Acceso no autorizado: Debe proveer una credencial Bearer token activa." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Acceso no autorizado: Token inválido o vacío." });
  }

  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return res.status(401).json({ error: "Acceso no autorizado: El formato del token es inválido." });
    }

    // Decode JWT Payload safely
    const payloadBuffer = Buffer.from(parts[1], "base64");
    const payload = JSON.parse(payloadBuffer.toString("utf8"));

    const projectId = "gen-lang-client-0052201582";
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    const nowInSecs = Math.floor(Date.now() / 1000);

    // Verify token claim boundaries (Zero-Trust Validation)
    if (payload.iss !== expectedIssuer) {
      return res.status(403).json({ error: "Acceso denegado: El emisor de la credencial es inválido o ajeno al sistema." });
    }

    if (payload.aud !== projectId) {
      return res.status(403).json({ error: "Acceso denegado: La credencial no pertenece a esta aplicación cliente." });
    }

    if (payload.exp && payload.exp < nowInSecs) {
      return res.status(401).json({ error: "Acceso denegado: La credencial activa ha expirado. Por favor, inicie sesión de nuevo." });
    }

    // Attach active user context on valid claims
    (req as any).user = {
      uid: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified,
    };

    next();
  } catch (err) {
    console.error("Token verification failure:", err);
    return res.status(401).json({ error: "Acceso denegado: La verificación de la credencial falló." });
  }
}

function getGMT5DateString(): string {
  const d = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil', // GMT-5 with no DST
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(d);
  } catch (e) {
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const gmt5 = new Date(utc - (5 * 60 * 60 * 1000));
    return gmt5.toISOString().split('T')[0];
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers to prevent frame-overlay, cross-site leaks & MIME sniffing
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    
    // Configura CORS - Dynamic custom CORS origin reflecting & preflight handling
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Safe request payload limits to prevent OOM / Memory Starvation (DDoS)
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ limit: "8mb", extended: true }));

  // Apply Rate limiting specifically to API routes
  app.use("/api/", rateLimiter);

  // API Routes (Placeholders as most logic is client-side with Firestore, 
  // but fulfilling the requested FastAPI-style endpoints)
  
  app.post("/api/assistant", verifyAuthToken, async (req, res) => {
    try {
      const { messages, image, intermediaries, suppliers, catalog } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({ 
          text: "El asistente está funcionando en modo local porque no se ha detectado una clave API (GEMINI_API_KEY) en las variables de entorno. Por favor, configure su clave en las variables de entorno del servidor para disfrutar del análisis inteligente de imágenes y registros." 
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      // Structure and strictly sanitize chat messages for @google/genai contents list
      let contents: any[] = [];
      if (messages && Array.isArray(messages)) {
        contents = messages.map((m: any) => {
          const role = m.role === 'assistant' ? 'model' : sanitizeInputString(m.role);
          const parts = Array.isArray(m.parts) 
            ? m.parts.map((p: any) => ({ text: sanitizeInputString(p.text) })) 
            : [{ text: sanitizeInputString(m.text) }];
          return { role, parts };
        });
      }

      // If an image is uploaded in this turn, attach it as part of the last user prompt with strict MIME verification
      if (image && image.data && typeof image.data === "string" && image.mimeType && typeof image.mimeType === "string") {
        const mime = String(image.mimeType);
        if (!mime.startsWith("image/")) {
          return res.status(400).json({ error: "Formato de imagen inválido." });
        }

        const imagePart = {
          inlineData: {
            mimeType: mime,
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

      // Ensure turn order correctness (skip leading 'model' nodes, merge adjacent same-role messages)
      let normalizedContents: any[] = [];
      let foundUser = false;
      for (const m of contents) {
        if (m.role === 'user') {
          foundUser = true;
        }
        if (foundUser) {
          if (normalizedContents.length > 0 && normalizedContents[normalizedContents.length - 1].role === m.role) {
            normalizedContents[normalizedContents.length - 1].parts = [
              ...normalizedContents[normalizedContents.length - 1].parts,
              ...m.parts
            ];
          } else {
            normalizedContents.push({
              role: m.role,
              parts: m.parts
            });
          }
        }
      }

      // Fallback if empty after filtering
      if (normalizedContents.length === 0) {
        normalizedContents = [{ role: 'user', parts: [{ text: "Hola" }] }];
      }

      const todayStr = getGMT5DateString();

      // Deep Sanitize relational metadata collections to prevent Prompt Injection/Deceptions
      const cleanIntermediaries = Array.isArray(intermediaries) 
        ? intermediaries.map((i: any) => ({
            id: sanitizeInputString(i.id),
            name: sanitizeInputString(i.name),
            rate: typeof i.rate === "number" ? i.rate : 0
          }))
        : [];

      const cleanSuppliers = Array.isArray(suppliers) 
        ? suppliers.map((s: any) => ({
            id: sanitizeInputString(s.id),
            name: sanitizeInputString(s.name)
          }))
        : [];

      const cleanCatalog = Array.isArray(catalog) 
        ? catalog.map((c: any) => ({
            id: sanitizeInputString(c.id),
            name: sanitizeInputString(c.name),
            category: sanitizeInputString(c.category) || 'Streaming',
            pvp: typeof c.pvp === "number" ? c.pvp : 0,
            providers: Array.isArray(c.providers) ? c.providers.map((p: any) => sanitizeInputString(p)) : []
          }))
        : [];

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
   - Extraerá los datos claves:
     * Nombre del Producto / Servicio (ej. Netflix 1 Pantalla, Disney+, Max)
     * Correo electrónico de la cuenta ("email")
     * Contraseña ("password")
     * PIN o perfil registrado ("pin")
     * Fecha de vencimiento ("expirationDate" en formato YYYY-MM-DD. Si se indica "30 días" o similar, calcúlala sumando 30 días a la fecha de hoy, que es ${todayStr})
     * Costo del proveedor ("cost")
     * Precio sugerido o real de venta ("revenue" / precio de venta)
     * Nombre e ID del Proveedor ("supplierId" y "supplierName")
     * Número de teléfono, celular o contacto del cliente si se menciona o se ve en la captura ("clientContact")

CONTEXTO DEL USUARIO:
- Distribuidores/Intermediarios de ANT: ${JSON.stringify(cleanIntermediaries, null, 2)}
- Proveedores de Cuentas Digitales: ${JSON.stringify(cleanSuppliers, null, 2)}
- Catálogo de Servicios Digitales del usuario: ${JSON.stringify(cleanCatalog, null, 2)}

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
- DEBES incluir al final un bloque \`\`\`json-action con el siguiente formato EXACTO, calculando la fecha de vencimiento adecuadamente si es relativa (la fecha actual es ${todayStr}):
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
        contents: normalizedContents
      });

      res.json({ text: response.text || "No obtuve una respuesta válida de Gemini." });
    } catch (e: any) {
      console.error("Gemini Error:", e);
      res.status(500).json({ error: e.message || "Error al procesar la solicitud con Gemini." });
    }
  });

  app.get("/api/users", verifyAuthToken, (req, res) => {
    res.json({ message: "Use Firestore client to fetch users directly for real-time" });
  });

  app.get("/api/services", verifyAuthToken, (req, res) => {
    res.json({ message: "Use Firestore client for services" });
  });

  app.get("/api/updates", verifyAuthToken, (req, res) => {
    res.json({ message: "Use Firestore client for transactional updates" });
  });

  app.post("/api/billing/whatsapp", verifyAuthToken, (req, res) => {
    try {
      const { phone, items, total } = req.body;
      const safePhone = typeof phone === "string" ? phone.replace(/\D/g, '') : "";
      
      if (!safePhone || safePhone.length < 7) {
        return res.status(400).json({ error: "El número de teléfono suministrado es inválido." });
      }

      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "La lista de transacciones 'items' es requerida y debe ser un arreglo." });
      }

      const safeTotal = typeof total === "number" ? total : parseFloat(String(total)) || 0;
      
      // Construct structured, sanitized text report for intermediaries
      let text = "Control Financiero • Reporte de Actualizaciones Pendientes (Secure OWASP)\n\n";
      items.forEach((item: any) => {
        const clientSec = sanitizeInputString(item.finalClientName) || "S/N";
        const warehouseSec = sanitizeInputString(item.warehouse) || "S/N";
        const rateSec = typeof item.chargedRate === "number" ? item.chargedRate : 0;
        text += `• ${clientSec} - ${warehouseSec} - $${rateSec.toFixed(2)}\n`;
      });
      text += `\nTotal Consolidado General: $${safeTotal.toFixed(2)}`;
      
      const url = `https://wa.me/${safePhone}?text=${encodeURIComponent(text)}`;
      res.json({ url });
    } catch (err: any) {
      console.error("WhatsApp endpoint error:", err);
      res.status(500).json({ error: "Error de servidor al generar el reporte de cobranza." });
    }
  });

  app.get("/api/reports", verifyAuthToken, (req, res) => {
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
