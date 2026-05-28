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
