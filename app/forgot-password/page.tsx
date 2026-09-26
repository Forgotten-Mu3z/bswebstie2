import { notFound } from 'next/navigation';
import {
  AuthCard,
  inputClass,
  submitClass,
} from '@/components/admin/auth-card';
import { isAdminSite } from '@/server/security/site';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Forgot password',
  robots: { index: false, follow: false },
};

const errors: Record<string, string> = {
  missing: 'Enter your email.',
  locked: 'Too many requests. Wait 15 minutes, then try again.',
  blocked: 'Request blocked. Reload this page and try again.',
  invalid: 'That did not work. Reload this page and try again.',
  unavailable: 'This is not available right now. Please try again.',
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function ForgotPasswordPage({ searchParams }: Props) {
  if (!isAdminSite()) notFound();
  const params = await searchParams;

  return (
    <AuthCard
      title="Forgot password"
      intro="Enter your admin email. We will email you a link to choose a new password."
      error={params.error ? (errors[params.error] ?? errors.invalid) : null}
      notice={
        params.sent
          ? 'If that email belongs to an admin, a link is on its way. Check your inbox and spam folder. Nothing after a few minutes? At most 2 emails are sent per hour, so wait an hour and try again.'
          : null
      }
    >
      <form
        method="post"
        action="/api/auth/forgot"
        className="mt-6 grid gap-5"
      >
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
        <button type="submit" className={submitClass}>
          Email me a reset link
        </button>
      </form>
      <a
        href="/sign-in"
        className="mt-3 flex min-h-11 items-center justify-center text-sm text-fg-muted hover:text-fg"
      >
        Back to sign in
      </a>
    </AuthCard>
  );
}
