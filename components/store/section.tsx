import { ArrowRight } from 'lucide-react';
import { Eyebrow } from '@/components/ui/bits';

/** Page section with a numbered spec-sheet style heading. */
export function Section({
  index,
  eyebrow,
  title,
  href,
  linkLabel = 'View all',
  children,
  id,
}: {
  index?: string;
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const headingId =
    id ?? `section-${eyebrow.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <section
      aria-labelledby={headingId}
      className="mx-auto mt-16 max-w-[1400px] px-4 sm:mt-24 sm:px-6"
    >
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-4">
        <div>
          <Eyebrow>
            {index ? <span className="text-accent">{index} / </span> : null}
            {eyebrow}
          </Eyebrow>
          <h2
            id={headingId}
            className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {title}
          </h2>
        </div>
        {href ? (
          <a
            href={href}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm text-fg-muted hover:text-accent"
          >
            {linkLabel} <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        ) : null}
      </div>
      {children}
    </section>
  );
}
