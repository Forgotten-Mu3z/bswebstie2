import { env } from 'cloudflare:workers';

// AES-GCM encryption for values kept in D1 during a sign-in (the Supabase
// token between the password and code steps, and a new authenticator key).
// The key is the TOTP_ENCRYPTION_KEY secret; the name dates from when this
// site checked two-factor codes itself.

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

export async function seal(value: string, userId: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt(
    // Binding the user ID stops a value being copied onto another account.
    { name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(userId) },
    await encryptionKey(),
    new TextEncoder().encode(value),
  );
  return `v1.${b64(iv)}.${b64(new Uint8Array(sealed))}`;
}

export async function unseal(sealed: string, userId: string) {
  const [version, iv, data] = sealed.split('.');
  if (version !== 'v1' || !iv || !data) throw new Error('Unknown seal format');
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
