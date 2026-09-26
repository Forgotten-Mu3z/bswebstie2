import { passwordProblems, PASSWORD_MAX } from '@/lib/password-policy';
import { getD1 } from '@/server/db';
import { auditStatement } from '@/server/security/audit';
import { formRoute } from '@/server/security/form-flow';
import { clientIp, readForm, redirect } from '@/server/security/http';
import {
  emailKey,
  ipKey,
  isLocked,
  recordFailure,
  totpKey,
} from '@/server/security/lockout';
import { getAdminUser, startSession } from '@/server/security/sessions';
import {
  AuthRejected,
  isRejection,
  signInWithPassword,
  signOut,
  updatePassword,
  verifiedTotp,
} from '@/server/security/supabase';
import { checkCode } from '@/server/security/two-factor';

export const dynamic = 'force-dynamic';

// Change password. Needs a full (2FA) session, the current password and a
// fresh code; the new one must pass the shared rules. Every other session is
// signed out.
export const POST = formRoute('/security', async (request) => {
  const form = await readForm(request);
  const user = await getAdminUser();
  if (!user) return redirect('/sign-in?return_to=%2Fsecurity');
  const back = (code: string) => redirect(`/security?error=${code}`);

  const current = form.get('current_password') ?? '';
  const next = form.get('new_password') ?? '';
  const confirm = form.get('confirm_password') ?? '';
  const code = form.get('code') ?? '';
  if (!current || !next || next.length > PASSWORD_MAX) return back('missing');
  if (next !== confirm) return back('match');
  if (passwordProblems(next, user.email).length) return back('weak');
  if (next === current) return back('same');

  // Wrong current passwords count toward the normal sign-in lock.
  const keys = [emailKey(user.email), ipKey(clientIp(request))];
  if (await isLocked([...keys, totpKey(user.userId)])) return back('locked');
  let session;
  try {
    session = await signInWithPassword(user.email, current);
  } catch (error) {
    if (isRejection(error, 429)) return back('busy');
    if (!isRejection(error, 400, 422)) throw error;
    await recordFailure(keys);
    return back('current');
  }

  // Supabase only changes the password of a two-factor session.
  let token = session.access_token;
  const factor = verifiedTotp(session.user);
  if (factor) {
    const verified = await checkCode(user.userId, token, factor.id, code);
    if (!verified) {
      await signOut(token);
      await recordFailure([totpKey(user.userId), ipKey(clientIp(request))]);
      return back('code');
    }
    token = verified.access_token;
  }
  try {
    await updatePassword(token, next);
  } catch (error) {
    await signOut(token);
    if (error instanceof AuthRejected && error.code === 'same_password')
      return back('same');
    if (error instanceof AuthRejected && error.code === 'weak_password')
      return back('weak');
    throw error;
  }
  // Ends every Supabase session for this account, this one included.
  await signOut(token, 'global');

  const d1 = getD1();
  await d1.batch([
    d1.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.userId),
    auditStatement({
      actorUserId: user.userId,
      action: 'account.password_changed',
      resourceType: 'account',
      resourceId: user.userId,
      ipAddress: clientIp(request),
    }),
  ]);
  return redirect('/security?saved=1', await startSession(user.userId));
});
