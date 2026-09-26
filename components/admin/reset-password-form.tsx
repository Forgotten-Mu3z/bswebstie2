'use client';

import { useState, useSyncExternalStore } from 'react';
import { CodeField, submitClass } from './auth-card';
import { NewPasswordFields, passwordReady } from './password-form';

// The emailed link (password reset or invitation) arrives from Supabase with
// its one-time token in the address fragment (#access_token=...), which
// browsers never send to a server. This reads it, removes it from the address
// bar, and posts it with the new password.

const messages: Record<string, string> = {
  expired: 'This link has expired or was already used. Ask for a new one.',
  code: 'That code did not work. Wait for a new code and try again.',
  code_needed:
    'Two-factor sign-in is on for this account: enter the 6-digit code from your authenticator app.',
  weak: 'The new password does not meet every rule below.',
  match: 'The two new passwords do not match.',
  same: 'Choose a password you have not just used.',
  missing: 'Fill in the new password.',
  locked: 'Too many attempts. Wait 15 minutes, then try again.',
  no_access: 'This account does not have access to the admin panel.',
  blocked: 'Request blocked. Reload this page and try again.',
  unavailable: 'Changing passwords is not available right now. Please try again.',
};

type Link = { token: string | null; failed: boolean };
let link: Link | undefined;

/** Read once, then removed from the address bar (and from history). */
function readLink() {
  if (!link) {
    const params = new URLSearchParams(window.location.hash.slice(1));
    link = {
      token: params.get('access_token'),
      failed: params.has('error'),
    };
    if (window.location.hash)
      window.history.replaceState(null, '', window.location.pathname);
  }
  return link;
}
const noUpdates = () => () => {};

function emailFromToken(token: string) {
  try {
    const part = token.split('.')[1] ?? '';
    const json = atob(part.replaceAll('-', '+').replaceAll('_', '/'));
    return String((JSON.parse(json) as { email?: string }).email ?? '');
  } catch {
    return '';
  }
}

export function ResetPasswordForm() {
  // Undefined while rendering on the server: the fragment only exists here.
  const current = useSyncExternalStore(noUpdates, readLink, () => undefined);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!current)
    return <p className="mt-6 text-sm text-fg-muted">Checking your link…</p>;
  const { token } = current;
  if (!token || current.failed || error === 'expired')
    return (
      <div className="mt-6 grid gap-4">
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {token
            ? messages.expired
            : 'Open this page from the link in your email. That link has expired or is missing.'}
        </p>
        <a href="/forgot-password" className={submitClass}>
          Email me a new link
        </a>
      </div>
    );

  const email = emailFromToken(token);
  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/reset', {
        method: 'POST',
        body: new URLSearchParams({
          access_token: token,
          new_password: password,
          confirm_password: confirm,
          code: (form.get('code') as string | null) ?? '',
        }),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (result.ok) {
        window.location.assign('/sign-in?reset=1');
        return;
      }
      setError(result.error ?? 'unavailable');
    } catch {
      setError('unavailable');
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="mt-6 grid gap-5">
      {email ? (
        <>
          <p className="text-sm text-fg-muted">
            Account: <span className="font-medium text-fg">{email}</span>
          </p>
          {/* Lets password managers link the new password to this account. */}
          <input
            type="email"
            name="username"
            value={email}
            autoComplete="username"
            readOnly
            hidden
          />
        </>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {messages[error] ?? messages.unavailable}
        </p>
      ) : null}
      <NewPasswordFields
        email={email}
        password={password}
        confirm={confirm}
        onPassword={setPassword}
        onConfirm={setConfirm}
      />
      <CodeField
        label="6-digit code from your authenticator app"
        hint="Leave empty if you have not set up two-factor sign-in yet."
        required={false}
      />
      <button
        type="submit"
        disabled={busy || !passwordReady(password, confirm, email)}
        className={submitClass}
      >
        {busy ? 'Saving…' : 'Save new password'}
      </button>
    </form>
  );
}
