import { env } from 'cloudflare:workers';

// RFC 6238 time-based one-time passwords (SHA-1, 6 digits, 30 seconds), the
// format every authenticator app supports.
const PERIOD = 30;
const DIGITS = 6;
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function toBase32(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function fromBase32(text: string): Uint8Array<ArrayBuffer> {
  const clean = text.replace(/[\s=]/g, '').toUpperCase();
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error('Invalid base32 secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(bytes);
}

export function generateTotpSecret() {
  return toBase32(crypto.getRandomValues(new Uint8Array(20)));
}

async function codeForStep(secret: string, step: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    fromBase32(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const counter = new ArrayBuffer(8);
  new DataView(counter).setBigUint64(0, BigInt(step));
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counter));
  const offset = mac[mac.length - 1] & 15;
  const number =
    ((mac[offset] & 127) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(number % 10 ** DIGITS).padStart(DIGITS, '0');
}

function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index++)
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

/**
 * Returns the matched time step, or null. Accepts one step of clock drift each
 * way, and never a step at or before `lastStep`, so a code cannot be reused.
 */
export async function verifyTotp(
  secret: string,
  code: string,
  lastStep: number | null,
  now = Date.now(),
) {
  const clean = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  const current = Math.floor(now / 1000 / PERIOD);
  let matched: number | null = null;
  for (const step of [current - 1, current, current + 1]) {
    // Check every window so timing does not reveal which one matched.
    const ok = sameText(await codeForStep(secret, step), clean);
    if (ok && (lastStep === null || step > lastStep)) matched = step;
  }
  return matched;
}

export function totpUri(secret: string, email: string) {
  const issuer = 'BLACKSHARK Admin';
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}

// --- Encryption at rest -----------------------------------------------------

async function encryptionKey() {
  // Trimmed: a secret pasted or piped in often ends with a line break.
  const raw = env.TOTP_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error('TOTP_ENCRYPTION_KEY is not configured');
  const bytes = Uint8Array.from(atob(raw), (char) => char.charCodeAt(0));
  if (bytes.length !== 32)
    throw new Error('TOTP_ENCRYPTION_KEY must be 32 bytes (base64)');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (text: string) =>
  Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

export async function sealSecret(secret: string, userId: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt(
    // Binding the user ID stops a secret being copied onto another account.
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(userId) },
    await encryptionKey(),
    new TextEncoder().encode(secret),
  );
  return `v1.${b64(iv)}.${b64(new Uint8Array(sealed))}`;
}

export async function openSecret(sealed: string, userId: string) {
  const [version, iv, data] = sealed.split('.');
  if (version !== 'v1' || !iv || !data)
    throw new Error('Unknown secret format');
  const plain = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: unb64(iv),
      additionalData: new TextEncoder().encode(userId),
    },
    await encryptionKey(),
    unb64(data),
  );
  return new TextDecoder().decode(plain);
}
