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
import { isRejection, signOut } from '@/server/security/supabase';
import { checkCode } from '@/server/security/two-factor';

export const dynamic = 'force-dynamic';

// Step 2 of 2: a code from the authenticator app, checked by Supabase.
// Confirms a new app during setup, and is required at every later sign-in.
export const POST = formRoute('/sign-in', async (request) => {
  const form = await readForm(request);
  const returnTo = safeReturnPath(form.get('return_to'));
  const pending = await getPendingSignIn();
  if (!pending)
    return redirect(
      pageUrl('/sign-in', { error: 'expired', return_to: returnTo }),
    );

  const { state } = pending;
  const setup = !state.factorId;
  const page = setup ? '/sign-in/setup' : '/sign-in/verify';
  const factorId = state.factorId ?? state.setup?.factorId;
  if (!factorId)
    return redirect(pageUrl('/sign-in/setup', { return_to: returnTo }));

  const keys = [totpKey(pending.userId), ipKey(clientIp(request))];
  const lockOut = async () => {
    // Too many wrong codes: the pending sign-in is thrown away.
    await endSessionById(pending.sessionId);
    await signOut(state.token);
    return redirect(
      pageUrl('/sign-in', { error: 'locked', return_to: returnTo }),
      clearedSessionCookie(),
    );
  };
  if (await isLocked(keys)) return lockOut();

  let verified;
  try {
    verified = await checkCode(
      pending.userId,
      state.token,
      factorId,
      form.get('code') ?? '',
    );
  } catch (error) {
    // The Supabase side of this sign-in has ended: start again.
    if (!isRejection(error, 401, 403)) throw error;
    await endSessionById(pending.sessionId);
    return redirect(
      pageUrl('/sign-in', { error: 'expired', return_to: returnTo }),
      clearedSessionCookie(),
    );
  }
  if (!verified) {
    await recordFailure(keys);
    if (await isLocked(keys)) return lockOut();
    return redirect(pageUrl(page, { error: 'code', return_to: returnTo }));
  }

  // This site's own session takes over; the Supabase one is not kept.
  await signOut(verified.access_token);
  const d1 = getD1();
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
  return redirect(returnTo, await startSession(pending.userId));
});
