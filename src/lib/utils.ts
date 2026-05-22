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
