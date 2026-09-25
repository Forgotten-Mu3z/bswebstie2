// Stored format: pbkdf2_sha256$<iterations>$<salt base64>$<hash base64>.
// scripts/create-admin.mjs writes the same format. Cloudflare Workers cap
// PBKDF2 at 100,000 iterations, so that is the value used for new hashes.
const ITERATIONS = 100_000;
const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function derive(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2_sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

// A fixed hash lets unknown emails take the same time as wrong passwords.
const DUMMY_HASH =
  'pbkdf2_sha256$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

export async function verifyPassword(password: string, stored: string | null) {
  const [scheme, rawIterations, salt, expected] = (stored ?? DUMMY_HASH).split(
    '$',
  );
  const iterations = Number(rawIterations);
  if (
    scheme !== 'pbkdf2_sha256' ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > ITERATIONS ||
    !salt ||
    !expected
  )
    return false;
  let actual: Uint8Array, wanted: Uint8Array;
  try {
    actual = await derive(password, fromBase64(salt), iterations);
    wanted = fromBase64(expected);
  } catch {
    return false;
  }
  if (actual.length !== wanted.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index++)
    difference |= actual[index] ^ wanted[index];
  return difference === 0 && stored !== null;
}
