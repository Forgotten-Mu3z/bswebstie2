import { notFound, redirect } from 'next/navigation';
import { AuthCard, CodeField, submitClass } from '@/components/admin/auth-card';
import { pageUrl } from '@/server/security/form-flow';
import { getPendingSignIn, safeReturnPath } from '@/server/security/sessions';
import { isAdminSite } from '@/server/security/site';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Enter your code',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function VerifyPage({ searchParams }: Props) {
  if (!isAdminSite()) notFound();
  const params = await searchParams;
  const returnTo = safeReturnPath(params.return_to);
  const pending = await getPendingSignIn();
  if (!pending)
    redirect(pageUrl('/sign-in', { error: 'expired', return_to: returnTo }));
  if (!pending.state.factorId)
    redirect(pageUrl('/sign-in/setup', { return_to: returnTo }));

  return (
    <AuthCard
      step="Step 2 of 2"
      title="Enter your code"
      intro="Open your authenticator app and type the 6-digit code for BLACKSHARK Admin."
      error={
        params.error === 'code'
          ? 'That code did not work. Wait for a new code and try again.'
          : null
      }
    >
      <form
        method="post"
        action="/api/auth/two-factor"
        className="mt-6 grid gap-5"
      >
        <input type="hidden" name="return_to" value={returnTo} />
        <CodeField />
        <button type="submit" className={submitClass}>
          Sign in
        </button>
      </form>
      <form method="post" action="/api/auth/sign-out" className="mt-3">
        <button
          type="submit"
          className="min-h-11 w-full text-sm text-fg-muted hover:text-fg"
        >
          Cancel and start again
        </button>
      </form>
    </AuthCard>
  );
}
