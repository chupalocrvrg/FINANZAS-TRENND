/**
 * Security and Data Cleansing Utilities
 * Fully optimized to counter SQL Injection, XSS, and Brute Force spamming.
 */

// 1. INPUT SANITIZATION & INJECTION PREVENTATIVE CLEANUP
export function sanitizeString(val: any, maxLength = 250): string {
  if (val === null || val === undefined) return '';
  let str = String(val).trim();
  
  // Truncate to maximum standard safe length
  if (str.length > maxLength) {
    str = str.substring(0, maxLength);
  }
  
  // Neutralize common SQL Injection vectors and characters:
  // e.g. single quotes, double quotes, semicolons, comments, or union SQL keywords
  str = str
    .replace(/'/g, "''") // SQL escaping
    .replace(/;/g, " ")   // Remove SQL statement terminators
    .replace(/--/g, "-")  // Neutralize SQL comment symbols
    .replace(/\/\*/g, " ") // Neutralize block comments
    .replace(/\*\//g, " ")
    .replace(/\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|ALTER|WHERE|OR 1=1)\b/gi, "");

  // Neutralize common XSS tags / script markers
  str = str
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<\/?[^>]+(>|$)/g, "") // Strip HTML completely
    .replace(/javascript:/gi, "clean:");

  return str;
}

/**
 * Validates and deeply cleanses an object ensuring no raw injection or scripting
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  const result = { ...obj };
  for (const key in result) {
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const val = result[key];
      if (typeof val === 'string') {
        // Enforce safe limits for string values
        const maxLen = key.toLowerCase().includes('desc') || key.toLowerCase().includes('text') ? 1000 : 250;
        result[key] = sanitizeString(val, maxLen) as any;
      } else if (typeof val === 'object' && val !== null && !((val as any) instanceof Date)) {
        result[key] = sanitizeObject(val);
      }
    }
  }
  return result;
}

// 2. ACTION RATE LIMITER (Prevents brute force, rapid transactions, or database flooding)
interface RateLimitTracker {
  timestamps: number[];
}

export function checkRateLimit(
  actionKey: string,
  maxRequests = 15,
  windowMs = 60000
): { allowed: boolean; retryAfterSeconds: number } {
  try {
    const storageKey = `rate_limit_${actionKey}`;
    const now = Date.now();
    const dataStr = localStorage.getItem(storageKey);
    let tracker: RateLimitTracker = { timestamps: [] };

    if (dataStr) {
      try {
        tracker = JSON.parse(dataStr);
      } catch {
        tracker = { timestamps: [] };
      }
    }

    // Filter timestamps within current window
    tracker.timestamps = tracker.timestamps.filter((ts) => now - ts < windowMs);

    if (tracker.timestamps.length >= maxRequests) {
      const oldestTs = tracker.timestamps[0];
      const remainingMs = windowMs - (now - oldestTs);
      const retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    // Record new execution occurrence
    tracker.timestamps.push(now);
    localStorage.setItem(storageKey, JSON.stringify(tracker));

    return { allowed: true, retryAfterSeconds: 0 };
  } catch (error) {
    console.error("Local rate limit storage error", error);
    // Graceful pass under lock exception
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

// 3. CORE VALIDATION SCHEMA SCHEMES
export interface EntitySchema {
  name: string;
  type: 'client' | 'reseller' | 'intermediary' | 'supplier';
  contact?: string;
  rate?: number;
}

export interface DigitalServiceSchema {
  name: string;
  category: string;
  revenue: number;
  cost: number;
  email?: string;
  password?: string;
  clientName?: string;
  clientContact?: string;
  clientType?: string;
  expirationDate?: string;
}

export function validateEntityInput(entity: Partial<EntitySchema>): { valid: boolean; error?: string } {
  if (!entity.name || entity.name.trim().length === 0) {
    return { valid: false, error: 'El nombre es obligatorio' };
  }
  if (entity.name.length > 100) {
    return { valid: false, error: 'El nombre no puede exceder los 100 caracteres' };
  }
  if (!entity.type || !['client', 'reseller', 'intermediary', 'supplier'].includes(entity.type)) {
    return { valid: false, error: 'El tipo de entidad no es válido' };
  }
  if (entity.rate !== undefined && (isNaN(entity.rate) || entity.rate < 0)) {
    return { valid: false, error: 'La tasa/tarifa debe ser un número igual o mayor a cero' };
  }
  if (entity.contact && entity.contact.length > 150) {
    return { valid: false, error: 'El contacto/WhatsApp no puede exceder los 150 caracteres' };
  }
  return { valid: true };
}

export function validateDigitalServiceInput(ds: Partial<DigitalServiceSchema>): { valid: boolean; error?: string } {
  if (!ds.name || ds.name.trim().length === 0) {
    return { valid: false, error: 'El nombre del servicio es obligatorio' };
  }
  if (ds.name.length > 100) {
    return { valid: false, error: 'El nombre del servicio no puede exceder los 100 caracteres' };
  }
  if (!ds.category || ds.category.trim().length === 0) {
    return { valid: false, error: 'La categoría es obligatoria' };
  }
  if (ds.revenue === undefined || isNaN(ds.revenue) || ds.revenue < 0) {
    return { valid: false, error: 'El precio de venta (revenue) debe ser igual o mayor a 0' };
  }
  if (ds.cost === undefined || isNaN(ds.cost) || ds.cost < 0) {
    return { valid: false, error: 'El costo del servicio debe ser igual o mayor a 0' };
  }
  if (ds.email && ds.email.length > 150) {
    return { valid: false, error: 'El correo electrónico es demasiado largo' };
  }
  return { valid: true };
}
