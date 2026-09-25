import { cookies } from 'next/headers';
import { getD1 } from '@/server/db';
import { isAdminSite, isAllowedAdmin } from './site';

// Sessions: a random token in the cookie, only its SHA-256 hash in the
// database. The __Host- prefix makes browsers require Secure + Path=/ and no
// Domain, so the cookie never reaches the store or any other host. HttpOnly
// hides it from scripts; SameSite=Strict keeps it off cross-site requests.

export const SESSION_COOKIE = '__Host-bsg_admin';
const PENDING_SECONDS = 10 * 60; // password accepted, waiting for the 2FA code
const FULL_SECONDS = 12 * 60 * 60; // fully signed in

export type AdminUser = {
  userId: string;
  email: string;
  displayName: string;
  mustChangePassword: boolean;
};

export type PendingSignIn = {
  sessionId: string;
  userId: string;
  email: string;
  totpSecret: string | null;
  totpPendingSecret: string | null;
  totpLastStep: number | null;
  mustChangePassword: boolean;
};

const now = () => Math.floor(Date.now() / 1000);

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

export function sessionCookie(token: string, maxAge: number) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

export function clearedSessionCookie() {
  return sessionCookie('', 0);
}

/** Starts a session and returns its Set-Cookie value. */
export async function startSession(userId: string, verified: boolean) {
  const token = randomToken();
  const time = now();
  const maxAge = verified ? FULL_SECONDS : PENDING_SECONDS;
  const d1 = getD1();
  await d1.batch([
    d1.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(time),
    d1
      .prepare(
        'INSERT INTO sessions (id, user_id, created_at, expires_at, mfa_verified_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(
        await sha256Hex(token),
        userId,
        time,
        time + maxAge,
        verified ? time : null,
      ),
  ]);
  return sessionCookie(token, maxAge);
}

export async function readSessionToken() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token && token.length <= 100 ? token : undefined;
}

export async function endSession(token: string | undefined) {
  if (!token) return;
  await getD1()
    .prepare('DELETE FROM sessions WHERE id = ?')
    .bind(await sha256Hex(token))
    .run();
}

export async function endSessionById(sessionId: string) {
  await getD1()
    .prepare('DELETE FROM sessions WHERE id = ?')
    .bind(sessionId)
    .run();
}

type Row = {
  session_id: string;
  mfa_verified_at: number | null;
  id: string;
  email: string;
  display_name: string;
  must_change_password: number;
  totp_secret: string | null;
  totp_pending_secret: string | null;
  totp_last_step: number | null;
};

async function currentRow(): Promise<Row | null> {
  // Admin sessions only exist on the admin site.
  if (!isAdminSite()) return null;
  const token = await readSessionToken();
  if (!token) return null;
  const row = await getD1()
    .prepare(
      `SELECT s.id AS session_id, s.mfa_verified_at, u.id, u.email, u.display_name,
        u.must_change_password, u.totp_secret, u.totp_pending_secret, u.totp_last_step
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > ? AND u.suspended_at IS NULL`,
    )
    .bind(await sha256Hex(token), now())
    .first<Row>();
  // Removing an email from ADMIN_EMAILS ends its sessions immediately.
  return row && isAllowedAdmin(row.email) ? row : null;
}

/** Signed in with password AND two-factor code. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const row = await currentRow();
  if (!row || row.mfa_verified_at === null || !row.totp_secret) return null;
  return {
    userId: row.id,
    email: row.email,
    displayName: row.display_name || row.email,
    mustChangePassword: Boolean(row.must_change_password),
  };
}

/** Password accepted; two-factor code still needed. */
export async function getPendingSignIn(): Promise<PendingSignIn | null> {
  const row = await currentRow();
  if (!row || row.mfa_verified_at !== null) return null;
  return {
    sessionId: row.session_id,
    userId: row.id,
    email: row.email,
    totpSecret: row.totp_secret,
    totpPendingSecret: row.totp_pending_secret,
    totpLastStep: row.totp_last_step,
    mustChangePassword: Boolean(row.must_change_password),
  };
}

/** Only same-site relative paths, never back into the sign-in pages. */
export function safeReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//'))
    return '/admin';
  try {
    const url = new URL(value, 'https://local.invalid');
    if (
      url.origin !== 'https://local.invalid' ||
      url.pathname.startsWith('/sign-in')
    )
      return '/admin';
    return `${url.pathname}${url.search}`;
  } catch {
    return '/admin';
  }
}

export function signInPath(returnTo = '/admin') {
  const target = safeReturnPath(returnTo);
  return target === '/admin'
    ? '/sign-in'
    : `/sign-in?return_to=${encodeURIComponent(target)}`;
}
