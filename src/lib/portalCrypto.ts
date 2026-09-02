/**
 * Cryptographic & URL masking engine for Client Public Portals and Vouchers.
 * Encrypts all identifiers, client names, owner IDs, and tokens into a single URL-safe string.
 */

const CIPHER_KEY = "CTLF_SECURE_PORTAL_ENCRYPTION_SALT_2026_@PROD";

export interface DecryptedPortalData {
  view: 'client-portal' | 'voucher';
  ownerId: string;
  clientName?: string;
  token?: string;
  voucherId?: string;
  voucherType?: string;
}

/**
 * Base64 URL-safe encoding and decoding helpers
 */
function toBase64Url(str: string): string {
  try {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (e) {
    return btoa(unescape(encodeURIComponent(str)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }
}

function fromBase64Url(base64Url: string): string {
  try {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return decodeURIComponent(escape(atob(base64)));
  }
}

/**
 * Deterministic multi-round XOR permutation with key expansion
 */
function xorEncrypt(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyChar = key.charCodeAt((i * 7 + 13) % key.length);
    const cipherCode = (charCode ^ keyChar) ^ ((i + 3) & 0x1f);
    result += String.fromCharCode(cipherCode);
  }
  return result;
}

function xorDecrypt(cipherText: string, key: string): string {
  let result = '';
  for (let i = 0; i < cipherText.length; i++) {
    const cipherCode = cipherText.charCodeAt(i);
    const keyChar = key.charCodeAt((i * 7 + 13) % key.length);
    const originalCode = (cipherCode ^ ((i + 3) & 0x1f)) ^ keyChar;
    result += String.fromCharCode(originalCode);
  }
  return result;
}

/**
 * Simple 32-bit checksum for payload integrity
 */
function calculateChecksum(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) + hash) + text.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Encrypts a portal or voucher payload into a compact, encrypted, URL-safe token.
 */
export function encryptPortalPayload(data: DecryptedPortalData): string {
  const compactPayload = JSON.stringify({
    v: data.view === 'client-portal' ? 'cp' : 'vc',
    o: data.ownerId,
    c: data.clientName || undefined,
    t: data.token || undefined,
    id: data.voucherId || undefined,
    ty: data.voucherType || undefined,
    ts: Date.now()
  });

  const checksum = calculateChecksum(compactPayload);
  const packaged = `${checksum}:${compactPayload}`;
  const encrypted = xorEncrypt(packaged, CIPHER_KEY);
  return toBase64Url(encrypted);
}

/**
 * Decrypts and validates a URL-safe encrypted portal token.
 */
export function decryptPortalPayload(cipherToken: string): DecryptedPortalData | null {
  if (!cipherToken) return null;
  try {
    const rawCipher = fromBase64Url(cipherToken.trim());
    const decrypted = xorDecrypt(rawCipher, CIPHER_KEY);
    const separatorIndex = decrypted.indexOf(':');
    if (separatorIndex === -1) return null;

    const checksum = decrypted.substring(0, separatorIndex);
    const jsonStr = decrypted.substring(separatorIndex + 1);

    const expectedChecksum = calculateChecksum(jsonStr);
    if (checksum !== expectedChecksum) {
      console.warn("Portal token checksum mismatch (tampered or invalid).");
      return null;
    }

    const parsed = JSON.parse(jsonStr);
    return {
      view: parsed.v === 'cp' ? 'client-portal' : 'voucher',
      ownerId: parsed.o || '',
      clientName: parsed.c || undefined,
      token: parsed.t || undefined,
      voucherId: parsed.id || undefined,
      voucherType: parsed.ty || undefined
    };
  } catch (error) {
    console.warn("Failed to decrypt portal payload:", error);
    return null;
  }
}
