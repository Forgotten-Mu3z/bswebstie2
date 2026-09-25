'use client';

import { buttonClass } from '@/components/ui/button';

// Shown inside the site's shell when a page fails. Error details stay in the logs.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="relative grid min-h-[70vh] place-items-center px-4 py-16 text-center">
      <div aria-hidden="true" className="blueprint absolute inset-0" />
      <div className="relative max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          Error · 500
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Something went wrong
        </h1>
        <p className="mt-4 leading-7 text-fg-muted">
          This page could not load right now. Please try again in a moment.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className={buttonClass('primary', 'lg')}
          >
            Try again
          </button>
          <a href="/" className={buttonClass('secondary', 'lg')}>
            Go to home
          </a>
        </div>
      </div>
    </div>
  );
}
