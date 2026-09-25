import { getD1 } from '@/server/db';
import { formRoute, pageUrl } from '@/server/security/form-flow';
import { clientIp, readForm, redirect } from '@/server/security/http';
import {
  clearFailures,
  emailKey,
  ipKey,
  isLocked,
  recordFailure,
} from '@/server/security/lockout';
import { verifyPassword } from '@/server/security/passwords';
import {
  endSession,
  readSessionToken,
  safeReturnPath,
  startSession,
} from '@/server/security/sessions';
import { isAllowedAdmin } from '@/server/security/site';

export const dynamic = 'force-dynamic';

// Step 1 of 2: email + password. Success only creates a 10-minute "pending"
// session that can do nothing except finish two-factor sign-in.
export const POST = formRoute('/sign-in', async (request) => {
  const form = await readForm(request);
  const returnTo = safeReturnPath(form.get('return_to'));
  const back = (code: string) =>
    redirect(pageUrl('/sign-in', { error: code, return_to: returnTo }));
  const email = (form.get('email') ?? '').trim().toLowerCase().slice(0, 254);
  const password = (form.get('password') ?? '').slice(0, 200);
  if (!email || !password) return back('missing');

  const keys = [emailKey(email), ipKey(clientIp(request))];
  if (await isLocked(keys)) return back('locked');

  // Emails outside ADMIN_EMAILS get the same answer and the same hashing time
  // as a wrong password, so the allowlist cannot be probed.
  const user = isAllowedAdmin(email)
    ? await getD1()
        .prepare(
          'SELECT id, password_hash, totp_secret FROM users WHERE email = ? AND suspended_at IS NULL',
        )
        .bind(email)
        .first<{
          id: string;
          password_hash: string | null;
          totp_secret: string | null;
        }>()
    : null;
  const valid = await verifyPassword(password, user?.password_hash ?? null);
  if (!user || !valid) {
    await recordFailure(keys);
    return back('invalid');
  }

  await clearFailures([emailKey(email)]);
  await endSession(await readSessionToken());
  const cookie = await startSession(user.id, false);
  const next = user.totp_secret ? '/sign-in/verify' : '/sign-in/setup';
  return redirect(pageUrl(next, { return_to: returnTo }), cookie);
});
