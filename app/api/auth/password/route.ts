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
} from '@/server/security/lockout';
import { hashPassword, verifyPassword } from '@/server/security/passwords';
import { getAdminUser, startSession } from '@/server/security/sessions';

export const dynamic = 'force-dynamic';

// Change password. Needs a full (2FA) session and the current password; the
// new one must pass the shared rules. Every other session is signed out.
export const POST = formRoute('/security', async (request) => {
  const form = await readForm(request);
  const user = await getAdminUser();
  if (!user) return redirect('/sign-in?return_to=%2Fsecurity');
  const back = (code: string) => redirect(`/security?error=${code}`);

  const current = form.get('current_password') ?? '';
  const next = form.get('new_password') ?? '';
  const confirm = form.get('confirm_password') ?? '';
  if (!current || !next || next.length > PASSWORD_MAX) return back('missing');

  // Wrong current passwords count toward the normal sign-in lock.
  const keys = [emailKey(user.email), ipKey(clientIp(request))];
  if (await isLocked(keys)) return back('locked');
  const d1 = getD1();
  const row = await d1
    .prepare('SELECT password_hash FROM users WHERE id = ?')
    .bind(user.userId)
    .first<{ password_hash: string | null }>();
  if (!(await verifyPassword(current, row?.password_hash ?? null))) {
    await recordFailure(keys);
    return back('current');
  }
  if (next !== confirm) return back('match');
  if (passwordProblems(next, user.email).length) return back('weak');
  if (next === current) return back('same');

  const time = Math.floor(Date.now() / 1000);
  await d1.batch([
    d1
      .prepare(
        'UPDATE users SET password_hash = ?, must_change_password = 0, password_changed_at = ?, updated_at = ? WHERE id = ?',
      )
      .bind(await hashPassword(next), time, time, user.userId),
    d1.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.userId),
    auditStatement({
      actorUserId: user.userId,
      action: 'account.password_changed',
      resourceType: 'account',
      resourceId: user.userId,
      ipAddress: clientIp(request),
    }),
  ]);
  return redirect('/security?saved=1', await startSession(user.userId, true));
});
