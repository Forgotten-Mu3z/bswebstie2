import { notFound, redirect } from 'next/navigation';
import { renderSVG } from 'uqr';
import { AuthCard, CodeField, submitClass } from '@/components/admin/auth-card';
import { pageUrl } from '@/server/security/form-flow';
import { getPendingSignIn, safeReturnPath } from '@/server/security/sessions';
import { isAdminSite } from '@/server/security/site';
import { totpUri } from '@/server/security/totp';
import { getSetupSecret } from '@/server/security/two-factor';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Set up two-factor sign-in',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export default async function SetupPage({ searchParams }: Props) {
  if (!isAdminSite()) notFound();
  const params = await searchParams;
  const returnTo = safeReturnPath(params.return_to);
  const pending = await getPendingSignIn();
  if (!pending)
    redirect(pageUrl('/sign-in', { error: 'expired', return_to: returnTo }));
  if (pending.totpSecret)
    redirect(pageUrl('/sign-in/verify', { return_to: returnTo }));

  const secret = await getSetupSecret(pending);
  const qr = renderSVG(totpUri(secret, pending.email), {
    pixelSize: 6,
    whiteColor: '#ffffff',
    blackColor: '#07080b',
  });

  return (
    <AuthCard
      wide
      step="Step 2 of 2"
      title="Set up two-factor sign-in"
      intro="Every sign-in needs your password and a code from an authenticator app on your phone."
      error={
        params.error === 'code'
          ? 'That code did not work. Check the time on your phone and try the newest code.'
          : null
      }
    >
      <ol className="mt-6 grid gap-6">
        <li className="grid grid-cols-[2rem_1fr] gap-3">
          <span aria-hidden="true" className="font-mono text-sm text-accent">
            01
          </span>
          <div>
            <p className="font-medium">Install an authenticator app</p>
            <p className="mt-1 text-sm text-fg-muted">
              For example Google Authenticator, Microsoft Authenticator or 2FAS.
            </p>
          </div>
        </li>
        <li className="grid grid-cols-[2rem_1fr] gap-3">
          <span aria-hidden="true" className="font-mono text-sm text-accent">
            02
          </span>
          <div>
            <p className="font-medium">Scan this code with the app</p>
            {/* A data URL: the QR code never leaves this response. */}
            {/* oxlint-disable-next-line nextjs/no-img-element -- inline data URL, nothing to optimise */}
            <img
              src={`data:image/svg+xml;base64,${btoa(qr)}`}
              alt="QR code for adding BLACKSHARK Admin to your authenticator app"
              width={200}
              height={200}
              className="mt-3 block size-50 rounded-md bg-white p-3"
            />
            <details className="mt-3 text-sm">
              <summary className="min-h-11 cursor-pointer py-2 font-medium text-accent">
                Can’t scan? Type the key instead
              </summary>
              <p className="text-fg-muted">
                Choose “Enter a setup key”, time-based, and type:
              </p>
              <p className="mt-2 break-all rounded-md bg-ink-950 px-3 py-2 font-mono text-base tracking-wider">
                {secret.match(/.{1,4}/g)?.join(' ')}
              </p>
            </details>
          </div>
        </li>
        <li className="grid grid-cols-[2rem_1fr] gap-3">
          <span aria-hidden="true" className="font-mono text-sm text-accent">
            03
          </span>
          <div>
            <p className="font-medium">Type the 6-digit code the app shows</p>
            <form
              method="post"
              action="/api/auth/two-factor"
              className="mt-3 grid gap-4"
            >
              <input type="hidden" name="return_to" value={returnTo} />
              <CodeField />
              <button type="submit" className={submitClass}>
                Turn on two-factor sign-in
              </button>
            </form>
          </div>
        </li>
      </ol>
      <p className="mt-6 border-t border-line pt-4 text-sm leading-6 text-fg-subtle">
        Keep this key private. If you lose your phone, the store owner can reset
        two-factor sign-in with the{' '}
        <code className="font-mono">admin:create</code> command.
      </p>
    </AuthCard>
  );
}
