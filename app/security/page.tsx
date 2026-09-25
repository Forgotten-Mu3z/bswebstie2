import { notFound, redirect } from 'next/navigation';
import { AdminShell } from '@/components/admin/admin-shell';
import { PasswordForm } from '@/components/admin/password-form';
import { Eyebrow } from '@/components/ui/bits';
import { getAdminUser, signInPath } from '@/server/security/sessions';
import { isAdminSite } from '@/server/security/site';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Security',
  robots: { index: false, follow: false },
};

const errors: Record<string, string> = {
  missing: 'Fill in every field.',
  current: 'Your current password is not correct.',
  match: 'The two new passwords do not match.',
  weak: 'The new password does not meet every rule below.',
  same: 'Choose a password you have not just used.',
  locked: 'Too many wrong passwords. Wait 15 minutes, then try again.',
  blocked: 'Request blocked. Reload this page and try again.',
  invalid: 'That did not work. Reload this page and try again.',
  unavailable:
    'Changing passwords is not available right now. Please try again.',
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function SecurityPage({ searchParams }: Props) {
  if (!isAdminSite()) notFound();
  const user = await getAdminUser();
  if (!user) redirect(signInPath('/security'));
  const params = await searchParams;
  const error = params.error ? (errors[params.error] ?? errors.invalid) : null;

  return (
    <AdminShell email={user.email} nav={!user.mustChangePassword}>
      <div className="mx-auto max-w-xl">
        <Eyebrow>Account</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Security</h1>
        {user.mustChangePassword ? (
          <output className="mt-5 block rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm">
            You signed in with a temporary password. Choose your own password to
            open the admin panel.
          </output>
        ) : null}
        {params.saved ? (
          <output className="mt-5 block rounded-md border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">
            Password changed. Every other device was signed out.
          </output>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="mt-5 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        <section
          aria-labelledby="password-title"
          className="mt-8 rounded-lg border border-line bg-ink-900 p-6"
        >
          <h2 id="password-title" className="text-lg font-semibold">
            Change password
          </h2>
          <p className="mt-1 mb-6 text-sm text-fg-muted">
            Changing it signs out every other device.
          </p>
          <PasswordForm email={user.email} />
        </section>

        <section
          aria-labelledby="twofa-title"
          className="mt-6 rounded-lg border border-line bg-ink-900 p-6"
        >
          <h2 id="twofa-title" className="text-lg font-semibold">
            Two-factor sign-in
          </h2>
          <p className="mt-1 text-sm leading-6 text-fg-muted">
            <span className="font-medium text-ok">On.</span> Every sign-in asks
            for a code from your authenticator app. If you lose your phone, the
            store owner can reset it with the{' '}
            <code className="font-mono">admin:create</code> command.
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
