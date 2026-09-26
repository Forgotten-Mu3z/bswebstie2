import Image from 'next/image';
import { buttonClass } from '@/components/ui/button';

// Shared frame and fields for the sign-in, two-factor and password pages.
// These pages are plain HTML forms, so they work without JavaScript.

export const inputClass =
  'h-12 w-full rounded-md border border-line-strong bg-ink-850 px-3 text-fg placeholder:text-fg-subtle hover:border-fg-subtle';
export const submitClass = buttonClass(
  'primary',
  'lg',
  'w-full justify-center',
);

export function AuthCard({
  step,
  title,
  intro,
  error,
  notice,
  wide = false,
  children,
}: {
  step?: string;
  title: string;
  intro: string;
  error?: string | null;
  notice?: string | null;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main
      id="main"
      className="relative grid min-h-screen place-items-center px-4 py-10"
    >
      <div aria-hidden="true" className="blueprint absolute inset-0" />
      <section
        aria-labelledby="auth-title"
        className={`relative w-full rounded-lg border border-line-strong bg-ink-900 shadow-2xl shadow-black/50 ${wide ? 'max-w-lg' : 'max-w-md'}`}
      >
        <div className="flex items-center gap-3 border-b border-line px-6 py-4">
          <Image
            src="/logo-96.png"
            unoptimized
            alt=""
            width={32}
            height={32}
            className="rounded"
          />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            BLACKSHARK · Admin
            {step ? <span className="text-accent"> · {step}</span> : null}
          </p>
        </div>
        <div className="p-6 sm:p-8">
          <h1 id="auth-title" className="text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          <p className="mt-2 leading-7 text-fg-muted">{intro}</p>
          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}
          {notice ? (
            <output className="mt-5 block rounded-md border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">
              {notice}
            </output>
          ) : null}
          {children}
        </div>
      </section>
    </main>
  );
}

export function CodeField({
  label = '6-digit code',
  hint,
  required = true,
}: {
  label?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <label htmlFor="code" className="text-sm font-medium">
        {label}
      </label>
      <input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        required={required}
        aria-describedby={hint ? 'code-hint' : undefined}
        className={`${inputClass} text-center font-mono text-2xl tracking-[0.4em]`}
      />
      {hint ? (
        <p id="code-hint" className="text-sm text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
