import { getD1 } from '@/server/db';
import { auditStatement } from '@/server/security/audit';
import { formRoute, pageUrl } from '@/server/security/form-flow';
import { clientIp, readForm, redirect } from '@/server/security/http';
import {
  clearFailures,
  ipKey,
  isLocked,
  recordFailure,
  totpKey,
} from '@/server/security/lockout';
import {
  clearedSessionCookie,
  endSessionById,
  getPendingSignIn,
  safeReturnPath,
  startSession,
} from '@/server/security/sessions';
import { openSecret, verifyTotp } from '@/server/security/totp';

export const dynamic = 'force-dynamic';

// Step 2 of 2: a code from the authenticator app. Confirms a new secret during
// setup, and is required at every later sign-in.
export const POST = formRoute('/sign-in', async (request) => {
  const form = await readForm(request);
  const returnTo = safeReturnPath(form.get('return_to'));
  const pending = await getPendingSignIn();
  if (!pending)
    return redirect(
      pageUrl('/sign-in', { error: 'expired', return_to: returnTo }),
    );

  const setup = !pending.totpSecret;
  const page = setup ? '/sign-in/setup' : '/sign-in/verify';
  const keys = [totpKey(pending.userId), ipKey(clientIp(request))];
  const lockOut = async () => {
    // Too many wrong codes: the pending sign-in is thrown away.
    await endSessionById(pending.sessionId);
    return redirect(
      pageUrl('/sign-in', { error: 'locked', return_to: returnTo }),
      clearedSessionCookie(),
    );
  };
  if (await isLocked(keys)) return lockOut();

  const sealed = setup ? pending.totpPendingSecret : pending.totpSecret;
  if (!sealed)
    return redirect(pageUrl('/sign-in/setup', { return_to: returnTo }));
  const step = await verifyTotp(
    await openSecret(sealed, pending.userId),
    form.get('code') ?? '',
    pending.totpLastStep,
  );
  if (step === null) {
    await recordFailure(keys);
    if (await isLocked(keys)) return lockOut();
    return redirect(pageUrl(page, { error: 'code', return_to: returnTo }));
  }

  const d1 = getD1();
  const time = Math.floor(Date.now() / 1000);
  // The step guard rejects a replayed code even if two requests race.
  const accepted = await d1
    .prepare(
      `UPDATE users SET totp_last_step = ?1,
        totp_secret = CASE WHEN ?2 = 1 THEN totp_pending_secret ELSE totp_secret END,
        totp_pending_secret = NULL, updated_at = ?3
      WHERE id = ?4 AND (totp_last_step IS NULL OR totp_last_step < ?1)`,
    )
    .bind(step, setup ? 1 : 0, time, pending.userId)
    .run();
  if (accepted.meta.changes !== 1)
    return redirect(pageUrl(page, { error: 'code', return_to: returnTo }));

  await d1.batch([
    d1.prepare('DELETE FROM sessions WHERE id = ?').bind(pending.sessionId),
    auditStatement({
      actorUserId: pending.userId,
      action: setup ? 'account.two_factor_enabled' : 'account.sign_in',
      resourceType: 'account',
      resourceId: pending.userId,
      ipAddress: clientIp(request),
    }),
  ]);
  await clearFailures([totpKey(pending.userId)]);
  // A brand-new token for the full session.
  const cookie = await startSession(pending.userId, true);
  return redirect(
    pending.mustChangePassword ? '/security?required=1' : returnTo,
    cookie,
  );
});
