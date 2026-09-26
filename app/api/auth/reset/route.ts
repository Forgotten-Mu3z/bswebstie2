import { passwordProblems, PASSWORD_MAX } from '@/lib/password-policy';
import { getD1 } from '@/server/db';
import { auditStatement } from '@/server/security/audit';
import {
  clientIp,
  drainSmallBody,
  HttpError,
  json,
  notFound,
  readForm,
} from '@/server/security/http';
import {
  clearFailures,
  emailKey,
  ipKey,
  isLocked,
  recordFailure,
  totpKey,
} from '@/server/security/lockout';
import { isAdminSite, isAllowedAdmin } from '@/server/security/site';
import {
  AuthRejected,
  getUser,
  isRejection,
  signOut,
  updatePassword,
  verifiedTotp,
} from '@/server/security/supabase';
import { checkCode } from '@/server/security/two-factor';

export const dynamic = 'force-dynamic';

// Sets a new password from an emailed link (reset, or an invitation). The
// link's Supabase token comes from the /reset-password page; with two-factor
// sign-in on, a code is needed too. Answers JSON: { ok } or { error: code }.
export async function POST(request: Request) {
  if (!isAdminSite()) {
    await drainSmallBody(request);
    return notFound();
  }
  try {
    return await reset(request);
  } catch (error) {
    await drainSmallBody(request);
    if (error instanceof HttpError)
      return json({ error: error.status === 403 ? 'blocked' : 'invalid' }, 400);
    console.error('Password reset failed', error);
    return json({ error: 'unavailable' }, 500);
  }
}

async function reset(request: Request) {
  // A Supabase token is about 1 KB; allow for it.
  const form = await readForm(request, 8000);
  const fail = (error: string) => json({ error }, 400);
  const token = form.get('access_token') ?? '';
  const next = form.get('new_password') ?? '';
  const confirm = form.get('confirm_password') ?? '';
  const code = form.get('code') ?? '';
  if (!token || token.length > 4096) return fail('expired');
  if (!next || next.length > PASSWORD_MAX) return fail('missing');
  if (next !== confirm) return fail('match');

  const ip = ipKey(clientIp(request));
  if (await isLocked([ip])) return fail('locked');
  let account;
  try {
    account = await getUser(token);
  } catch (error) {
    if (!isRejection(error)) throw error;
    await recordFailure([ip]);
    return fail('expired');
  }
  const email = account.email?.toLowerCase() ?? '';
  const user = isAllowedAdmin(email)
    ? await getD1()
        .prepare('SELECT id FROM users WHERE email = ? AND suspended_at IS NULL')
        .bind(email)
        .first<{ id: string }>()
    : null;
  if (!user) return fail('no_access');
  if (passwordProblems(next, email).length) return fail('weak');

  // Supabase only changes the password of a two-factor session.
  let sessionToken = token;
  const factor = verifiedTotp(account);
  if (factor) {
    const keys = [totpKey(user.id), ip];
    if (await isLocked(keys)) return fail('locked');
    if (!code) return fail('code_needed');
    const verified = await checkCode(user.id, token, factor.id, code).catch(
      (error: unknown) => {
        if (isRejection(error, 401, 403)) return 'expired' as const;
        throw error;
      },
    );
    if (verified === 'expired') return fail('expired');
    if (!verified) {
      await recordFailure(keys);
      return fail('code');
    }
    sessionToken = verified.access_token;
  }
  try {
    await updatePassword(sessionToken, next);
  } catch (error) {
    if (error instanceof AuthRejected && error.code === 'same_password')
      return fail('same');
    if (error instanceof AuthRejected && error.code === 'weak_password')
      return fail('weak');
    if (isRejection(error, 401, 403)) return fail('expired');
    throw error;
  }
  // Signs out every device, in Supabase and here.
  await signOut(sessionToken, 'global');
  const d1 = getD1();
  await d1.batch([
    d1.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
    auditStatement({
      actorUserId: user.id,
      action: 'account.password_reset',
      resourceType: 'account',
      resourceId: user.id,
      ipAddress: clientIp(request),
    }),
  ]);
  // A new password lifts a sign-in lock from earlier wrong guesses.
  await clearFailures([emailKey(email)]);
  return json({ ok: true });
}
