import { getD1 } from '@/server/db';
import { saveSignInState, type PendingSignIn } from './sessions';
import { enrollTotp, getUser, signOut, verifyCode } from './supabase';

/**
 * The authenticator app being added during a pending sign-in. Created once
 * and reused on reload, so a code that was already scanned keeps working.
 */
export async function getSetupFactor(pending: PendingSignIn) {
  if (pending.state.setup) return pending.state.setup;
  const { token } = pending.state;
  const factor = await enrollTotp(token, await getUser(token));
  const setup = {
    factorId: factor.id,
    secret: factor.totp.secret,
    uri: factor.totp.uri,
  };
  await saveSignInState({ ...pending, state: { ...pending.state, setup } });
  return setup;
}

// A code stays valid for up to 90 seconds (one 30-second step of clock drift
// each way). Remembering the last one accepted blocks replaying it in that time.
const CODE_LIFETIME = 90;

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Records a code Supabase accepted. False when the same code was already
 * accepted in the last 90 seconds; one statement, so two requests with the
 * same code cannot both get through.
 */
async function acceptCode(userId: string, code: string) {
  const time = Math.floor(Date.now() / 1000);
  const hash = await sha256Hex(`${userId}:${code.replace(/\s/g, '')}`);
  const result = await getD1()
    .prepare(
      `UPDATE users SET last_code = ?1, last_code_at = ?2
      WHERE id = ?3 AND NOT (last_code IS ?1 AND last_code_at > ?2 - ?4)`,
    )
    .bind(hash, time, userId, CODE_LIFETIME)
    .run();
  return result.meta.changes === 1;
}

/**
 * Checks a code with Supabase and against replays. Returns the two-factor
 * Supabase session, or null for a wrong, expired or reused code.
 */
export async function checkCode(
  userId: string,
  token: string,
  factorId: string,
  code: string,
) {
  const verified = await verifyCode(token, factorId, code);
  if (!verified) return null;
  if (await acceptCode(userId, code)) return verified;
  await signOut(verified.access_token);
  return null;
}
