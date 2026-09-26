import { formRoute } from '@/server/security/form-flow';
import { clientIp, readForm, redirect } from '@/server/security/http';
import { ipKey, isLocked, recordFailure } from '@/server/security/lockout';
import { isAllowedAdmin } from '@/server/security/site';
import { sendPasswordReset } from '@/server/security/supabase';

export const dynamic = 'force-dynamic';

// "Forgot password": Supabase emails a reset link that opens /reset-password.
// The answer is the same for every address, so it cannot be used to find out
// which emails are admins.
export const POST = formRoute('/forgot-password', async (request) => {
  const form = await readForm(request);
  const email = (form.get('email') ?? '').trim().toLowerCase().slice(0, 254);
  if (!email) return redirect('/forgot-password?error=missing');

  // Each request counts toward the per-address limit, so nobody can use this
  // form to flood an inbox.
  const keys = [ipKey(clientIp(request))];
  if (await isLocked(keys)) return redirect('/forgot-password?error=locked');
  await recordFailure(keys);

  if (isAllowedAdmin(email)) {
    const resetPage = new URL('/reset-password', request.url).toString();
    // Errors are logged, not shown: showing them would reveal an admin email.
    await sendPasswordReset(email, resetPage).catch((error) =>
      console.error('Password reset email failed', error),
    );
  }
  return redirect('/forgot-password?sent=1');
});
