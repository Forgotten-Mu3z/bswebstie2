import { notFound, redirect } from 'next/navigation';
import {
  AuthCard,
  inputClass,
  submitClass,
} from '@/components/admin/auth-card';
import { pageUrl } from '@/server/security/form-flow';
import {
  getAdminUser,
  getPendingSignIn,
  safeReturnPath,
} from '@/server/security/sessions';
import { isAdminSite } from '@/server/security/site';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

const errors: Record<string, string> = {
  invalid: 'The email or password is not correct.',
  missing: 'Enter your email and password.',
  locked: 'Too many failed attempts. Wait 15 minutes, then try again.',
  blocked: 'Request blocked. Reload this page and try again.',
  expired: 'Your sign-in expired. Enter your password again.',
  busy: 'Too many sign-in attempts right now. Wait a minute, then try again.',
  unavailable: 'Sign-in is not available right now. Please try again.',
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function SignInPage({ searchParams }: Props) {
  if (!isAdminSite()) notFound();
  const params = await searchParams;
  const returnTo = safeReturnPath(params.return_to);
  if (await getAdminUser().catch(() => null)) redirect(returnTo);
  const pending = await getPendingSignIn().catch(() => null);
  if (pending)
    redirect(
      pageUrl(pending.state.factorId ? '/sign-in/verify' : '/sign-in/setup', {
        return_to: returnTo,
      }),
    );

  return (
    <AuthCard
      step="Step 1 of 2"
      title="Sign in"
      intro="Enter your password. Next you will need a code from your authenticator app."
      error={params.error ? (errors[params.error] ?? errors.invalid) : null}
      notice={
        params.reset
          ? 'Password changed. Sign in with your new password.'
          : params.signed_out
            ? 'You are signed out.'
            : null
      }
    >
      <form
        method="post"
        action="/api/auth/sign-in"
        className="mt-6 grid gap-5"
      >
        <input type="hidden" name="return_to" value={returnTo} />
        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            className={inputClass}
          />
        </div>
        <div className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <a
              href="/forgot-password"
              className="-my-2 py-2 text-sm text-accent hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
            className={inputClass}
          />
        </div>
        <button type="submit" className={submitClass}>
          Continue
        </button>
      </form>
    </AuthCard>
  );
}
