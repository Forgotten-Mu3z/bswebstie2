import { env } from 'cloudflare:workers';

// Supabase Auth checks admin passwords, runs two-factor codes and sends the
// "reset password" emails. Called over its REST API from the Worker only; the
// browser never talks to Supabase and never sees its tokens.
//
// Supabase sessions are used for one sign-in step at a time and then signed
// out: once the code is accepted, this site's own session cookie takes over,
// and roles, permissions and the audit log stay in D1.

export type Factor = {
  id: string;
  factor_type: string;
  status: 'verified' | 'unverified';
};

export type AuthUser = {
  id: string;
  email?: string;
  factors?: Factor[];
};

type Session = { access_token: string; user: AuthUser };

/** Supabase answered, but not with success (wrong password, bad code...). */
export class AuthRejected extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(`Supabase Auth refused the request (${status} ${code})`);
  }
}

function config() {
  const url = env.SUPABASE_URL?.trim().replace(/\/+$/, '');
  const key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key)
    throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set');
  return { url, key };
}

async function call<T>(
  path: string,
  {
    method = 'POST',
    token,
    body,
  }: { method?: string; token?: string; body?: unknown } = {},
): Promise<T> {
  const { url, key } = config();
  const headers = new Headers({ apikey: key });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${url}/auth/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    const code = [data.error_code, data.code, data.error].find(
      (value) => typeof value === 'string' || typeof value === 'number',
    );
    // Server trouble is an outage, not a wrong password.
    if (response.status >= 500)
      throw new Error(`Supabase Auth failed: ${response.status} ${code}`);
    throw new AuthRejected(response.status, String(code ?? 'error'));
  }
  return data as T;
}

/** True for "wrong password / code / link", false for anything else. */
export function isRejection(error: unknown, ...statuses: number[]) {
  return (
    error instanceof AuthRejected &&
    (statuses.length ? statuses.includes(error.status) : error.status < 429)
  );
}

export const verifiedTotp = (user: AuthUser) =>
  user.factors?.find(
    (factor) => factor.factor_type === 'totp' && factor.status === 'verified',
  ) ?? null;

/** Email + password. Throws AuthRejected (400) when they do not match. */
export function signInWithPassword(email: string, password: string) {
  return call<Session>('/token?grant_type=password', {
    body: { email, password },
  });
}

export function getUser(token: string) {
  return call<AuthUser>('/user', { method: 'GET', token });
}

/** Starts adding an authenticator app. Removes older unfinished attempts. */
export async function enrollTotp(token: string, user: AuthUser) {
  for (const factor of user.factors ?? [])
    if (factor.factor_type === 'totp' && factor.status === 'unverified')
      await call(`/factors/${factor.id}`, { method: 'DELETE', token });
  return call<{ id: string; totp: { secret: string; uri: string } }>(
    '/factors',
    { token, body: { factor_type: 'totp', issuer: 'BLACKSHARK Admin' } },
  );
}

/**
 * Checks a 6-digit code. Returns the upgraded (two-factor) session, or null
 * when the code is wrong or already used.
 */
export async function verifyCode(token: string, factorId: string, code: string) {
  const clean = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return null;
  try {
    const challenge = await call<{ id: string }>(
      `/factors/${factorId}/challenge`,
      { token },
    );
    return await call<Session>(`/factors/${factorId}/verify`, {
      token,
      body: { challenge_id: challenge.id, code: clean },
    });
  } catch (error) {
    if (isRejection(error, 400, 422)) return null;
    throw error;
  }
}

/** Needs a two-factor session once two-factor sign-in is on. */
export function updatePassword(token: string, password: string) {
  return call<AuthUser>('/user', { method: 'PUT', token, body: { password } });
}

/**
 * Emails a reset link. Supabase only sends it to accounts that exist (and, on
 * its built-in email service, only to members of the project's team).
 */
export function sendPasswordReset(email: string, redirectTo: string) {
  return call(`/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    body: { email },
  });
}

/** Ends Supabase sessions; best effort, since ours is what counts. */
export async function signOut(
  token: string,
  scope: 'local' | 'global' = 'local',
) {
  try {
    await call(`/logout?scope=${scope}`, { token });
  } catch (error) {
    console.error('Supabase sign-out failed', error);
  }
}
