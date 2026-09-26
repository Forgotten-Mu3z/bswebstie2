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
import {
  endSession,
  readSessionToken,
  safeReturnPath,
  startSession,
} from '@/server/security/sessions';
import { isAllowedAdmin } from '@/server/security/site';
import {
  isRejection,
  signInWithPassword,
  signOut,
  verifiedTotp,
} from '@/server/security/supabase';

export const dynamic = 'force-dynamic';

// Step 1 of 2: email + password, checked by Supabase Auth. Success only
// creates a 10-minute "pending" session that can do nothing except finish
// two-factor sign-in.
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

  // Every attempt goes to Supabase, admin or not, so the answer and its
  // timing never show which emails are on the ADMIN_EMAILS list.
  let session: Awaited<ReturnType<typeof signInWithPassword>> | null = null;
  try {
    session = await signInWithPassword(email, password);
  } catch (error) {
    if (isRejection(error, 429)) return back('busy');
    // 400/422: wrong email or password. Anything else is a setup problem.
    if (!isRejection(error, 400, 422)) throw error;
  }
  const user =
    session && isAllowedAdmin(email)
      ? await getD1()
          .prepare(
            'SELECT id FROM users WHERE email = ? AND suspended_at IS NULL',
          )
          .bind(email)
          .first<{ id: string }>()
      : null;
  if (!session || !user) {
    if (session) await signOut(session.access_token);
    await recordFailure(keys);
    return back('invalid');
  }

  await clearFailures([emailKey(email)]);
  await endSession(await readSessionToken());
  const factor = verifiedTotp(session.user);
  const cookie = await startSession(user.id, {
    token: session.access_token,
    factorId: factor?.id ?? null,
  });
  const next = factor ? '/sign-in/verify' : '/sign-in/setup';
  return redirect(pageUrl(next, { return_to: returnTo }), cookie);
});
