'use client';

import clsx from 'clsx';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { checkPassword, PASSWORD_MAX } from '@/lib/password-policy';
import { CodeField, inputClass, submitClass } from './auth-card';

/** New password + confirmation, with the password rules checked live. */
export function NewPasswordFields({
  email,
  password,
  confirm,
  onPassword,
  onConfirm,
}: {
  email: string;
  password: string;
  confirm: string;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
}) {
  const checks = checkPassword(password, email);
  return (
    <>
      <div className="grid gap-2">
        <label htmlFor="new_password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
          maxLength={PASSWORD_MAX}
          value={password}
          onChange={(event) => onPassword(event.target.value)}
          aria-describedby="password-rules"
          className={inputClass}
        />
        <ul id="password-rules" className="grid gap-1.5 pt-1 text-sm">
          {checks.map((check) => (
            <li
              key={check.id}
              className={clsx(
                'flex items-start gap-2',
                check.ok ? 'text-ok' : 'text-fg-subtle',
              )}
            >
              {check.ok ? (
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              ) : (
                <X aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              )}
              <span>
                <span className="sr-only">
                  {check.ok ? 'Met: ' : 'Not met: '}
                </span>
                {check.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-2">
        <label htmlFor="confirm_password" className="text-sm font-medium">
          Type the new password again
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          maxLength={PASSWORD_MAX}
          value={confirm}
          onChange={(event) => onConfirm(event.target.value)}
          className={inputClass}
        />
        {confirm && confirm !== password ? (
          <p className="text-sm text-danger">The passwords do not match.</p>
        ) : null}
      </div>
    </>
  );
}

export function passwordReady(password: string, confirm: string, email: string) {
  return (
    checkPassword(password, email).every((check) => check.ok) &&
    password === confirm
  );
}

/** Change password while signed in: a plain form post. */
export function PasswordForm({ email }: { email: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  return (
    <form method="post" action="/api/auth/password" className="grid gap-5">
      {/* Lets password managers link the new password to this account. */}
      <input
        type="email"
        name="username"
        value={email}
        autoComplete="username"
        readOnly
        hidden
      />
      <div className="grid gap-2">
        <label htmlFor="current_password" className="text-sm font-medium">
          Current password
        </label>
        <input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          className={inputClass}
        />
      </div>
      <NewPasswordFields
        email={email}
        password={password}
        confirm={confirm}
        onPassword={setPassword}
        onConfirm={setConfirm}
      />
      <CodeField label="6-digit code from your authenticator app" />
      <button
        type="submit"
        disabled={!passwordReady(password, confirm, email)}
        className={submitClass}
      >
        Change password
      </button>
    </form>
  );
}
