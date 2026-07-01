import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function generateWhatsAppUrl(phone: string, text: string) {
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedText}`;
}

/**
 * Returns a Date object adjusted to GMT-5.
 */
export function getGMT5Date(dateInput?: Date | string | number): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc - (5 * 60 * 60 * 1000));
}

/**
 * Returns date string in YYYY-MM-DD format based on GMT-5.
 */
export function getGMT5DateString(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
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

/**
 * Returns formatted time in GMT-5 (HH:MM:SS)
 */
export function getGMT5TimeString(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  try {
    const formatter = new Intl.DateTimeFormat('es-EC', {
      timeZone: 'America/Guayaquil',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    return formatter.format(d);
  } catch (e) {
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const gmt5 = new Date(utc - (5 * 60 * 60 * 1000));
    return gmt5.toISOString().split('T')[1].slice(0, 8);
  }
}

/**
 * Returns full date time string for Audit/Registration in GMT-5 (YYYY-MM-DD HH:MM:SS GMT-5)
 */
export function getGMT5DateTimeString(dateInput?: Date | string | number): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  return `${getGMT5DateString(d)} ${getGMT5TimeString(d)} (GMT-5)`;
}

/**
 * Calculates service expiration date based on service name and provider message or note.
 * Standard default is 30 days. This helper parses other duration hints dynamically.
 */
export function calculateServiceExpirationDate(serviceName: string, supplierOrProviderMsg: string = ''): string {
  const combined = `${serviceName} ${supplierOrProviderMsg}`.toLowerCase();
  const today = new Date();

  // Look for days keyword first (e.g. "15 dias", "15 días", "45 dias", "7 d")
  const daysRegex = /(\d+)\s*(dí?as|d\b)/;
  const daysMatch = combined.match(daysRegex);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    if (!isNaN(days) && days > 0) {
      today.setDate(today.getDate() + days);
      return getGMT5DateString(today);
    }
  }

  // Look for years or annual indicators
  if (
    combined.includes('anual') || 
    combined.includes('año') || 
    combined.includes('anualmente') || 
    combined.includes('1 year') || 
    combined.includes('1 yr') || 
    combined.includes('12 meses') ||
    combined.includes('12m')
  ) {
    today.setDate(today.getDate() + 365);
    return getGMT5DateString(today);
  }

  // Look for semi-annual (180 days / 6 months)
  if (
    combined.includes('semestre') || 
    combined.includes('semestral') || 
    combined.includes('6m') || 
    combined.includes('6 meses')
  ) {
    today.setDate(today.getDate() + 180);
    return getGMT5DateString(today);
  }

  // Look for quarterly (90 days / 3 months)
  if (
    combined.includes('trimestre') || 
    combined.includes('trimestral') || 
    combined.includes('3m') || 
    combined.includes('3 meses')
  ) {
    today.setDate(today.getDate() + 90);
    return getGMT5DateString(today);
  }

  // Look for bi-monthly (60 days / 2 months)
  if (
    combined.includes('bimestre') || 
    combined.includes('bimestral') || 
    combined.includes('2m') || 
    combined.includes('2 meses')
  ) {
    today.setDate(today.getDate() + 60);
    return getGMT5DateString(today);
  }

  // Look for month counts e.g. "4 m", "4 meses", "5 meses", "2 meses"
  const monthsRegex = /(\d+)\s*(meses|mes|m\b)/;
  const monthsMatch = combined.match(monthsRegex);
  if (monthsMatch) {
    const months = parseInt(monthsMatch[1], 10);
    if (!isNaN(months) && months > 0) {
      today.setDate(today.getDate() + months * 30);
      return getGMT5DateString(today);
    }
  }

  // Default is 30 days
  today.setDate(today.getDate() + 30);
  return getGMT5DateString(today);
}

export const PAYMENT_INSTRUCTIONS_TXT = `💵 *MÉTODOS DE PAGO* 💵
--------------------------------
🏦 *DEPÓSITO / TRANSFERENCIA / APPS*

✅ *DATOS PARA DEPÓSITOS:*
• *Nombre:* GUTAMA CHIMA MARCELO
• *Cédula:* 0105884977
• *Correo:* marcelogutama3eroa@gmail.com

*Banco Pichincha* ✅
• *Ahorros:* 2203066545

*Banco Guayaquil* ✅
• *Ahorros:* 0032481285

*COOPERATIVA JEP* ✅
• *Ahorros:* 406002489704

*BINANCE* ✅
• *ID Binance:* 717956622
• *Enlace:* https://app.binance.com/qr/dplke9604c57f8c442e889ccb770899aa0e1
📌 *Verificar como:* Trennd001 (Al verificar, procede con el envío)

*PAYPAL* ✅
• *Enlace:* https://paypal.me/trennd07
📌 *Verificar:* Marcelo Gutama`;

export function formatSalesMessage(
  template: string | undefined,
  serviceData: {
    clientName: string;
    name: string;
    email?: string;
    password?: string;
    pin?: string;
    expirationDate: string;
  },
  companyName: string
): string {
  const defaultTemplate = `Hola *{cliente}*, te saludamos de *{empresa}*.\n\nConfirmamos la activación de tu servicio de *{servicio}*.\n👤 Usuario: {usuario}\n🔑 Clave: {clave}\n🔒 PIN/Mesa: {pin}\n\nFecha de vencimiento: *{vencimiento}*.\n\n¡Gracias por tu compra! 🎉`;
  
  const textToProcess = template && template.trim() ? template : defaultTemplate;

  return textToProcess
    .replace(/{cliente}/g, serviceData.clientName || 'Cliente')
    .replace(/{servicio}/g, serviceData.name || 'Servicio')
    .replace(/{usuario}/g, serviceData.email || 'N/A')
    .replace(/{clave}/g, serviceData.password || 'N/A')
    .replace(/{pin}/g, serviceData.pin || 'N/A')
    .replace(/{vencimiento}/g, serviceData.expirationDate || 'N/A')
    .replace(/{empresa}/g, companyName || 'Control Financiero');
}

export function getDynamicPaymentInstructions(wallets: any[]): string {
  const activeWallets = (wallets || []).filter((w: any) => w.accountNumber && w.accountNumber.trim() !== '');
  if (activeWallets.length > 0) {
    let text = `💵 *MÉTODOS DE PAGO* 💵\n--------------------------------\n🏦 *DATOS DE PAGO AUTORIZADOS:*`;
    activeWallets.forEach((w: any) => {
      text += `\n• *${w.name}:* ${w.accountNumber}`;
    });
    return text;
  }
  return PAYMENT_INSTRUCTIONS_TXT;
}

/**
 * Registra un evento de seguridad de forma local/offline para fines de auditoría OWASP
 */
export function addSecurityAuditLog(type: string, description: string) {
  try {
    const logsJson = localStorage.getItem('secure_audit_trail_v2');
    const logs = logsJson ? JSON.parse(logsJson) : [];
    
    const newLog = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: getGMT5DateTimeString(),
      type, // 'unlock_success', 'unlock_failed', 'credential_disclosed', 'backup_exported', 'settings_changed'
      description: description,
    };
    
    logs.unshift(newLog);
    
    // Limitar a máximo 200 registros de auditoría
    const trimmedLogs = logs.slice(0, 200);
    localStorage.setItem('secure_audit_trail_v2', JSON.stringify(trimmedLogs));
  } catch (err) {
    console.warn("No se pudo agregar el registro de auditoría de seguridad:", err);
  }
}


