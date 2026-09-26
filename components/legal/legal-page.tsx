import { ArrowRight } from 'lucide-react';
import { formatDate, LEGAL_DOCS } from '@/lib/legal';
import { breadcrumbLd } from '@/lib/seo';
import { Eyebrow } from '@/components/ui/bits';
import { JsonLd } from '@/components/ui/json-ld';
import { getSiteUrl } from '@/server/site-url';

export type LegalSection = {
  id: string;
  title: string;
  body: React.ReactNode;
};

/**
 * Frame for the policy pages and the contact page: breadcrumb, heading,
 * version date, contents list, sections, and links to the other policies.
 */
export async function LegalPage({
  path,
  title,
  updated,
  intro,
  sections,
}: {
  path: string;
  title: string;
  /** ISO date; also the document's version. */
  updated?: string;
  intro?: React.ReactNode;
  sections: LegalSection[];
}) {
  const siteUrl = await getSiteUrl();
  const isIndex = path === '/legal';
  const others = LEGAL_DOCS.filter((doc) => doc.path !== path);
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd
        data={breadcrumbLd(siteUrl, [
          { name: 'Legal', path: '/legal' },
          ...(isIndex ? [] : [{ name: title, path }]),
        ])}
      />
      <nav aria-label="Breadcrumb" className="font-mono text-xs text-fg-subtle">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <a href="/" className="hover:text-fg">
              Home
            </a>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            {isIndex ? (
              <span aria-current="page">Legal</span>
            ) : (
              <a href="/legal" className="hover:text-fg">
                Legal
              </a>
            )}
          </li>
          {isIndex ? null : (
            <>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-fg-muted">
                {title}
              </li>
            </>
          )}
        </ol>
      </nav>

      <Eyebrow className="mt-8">BLACKSHARK · Oman</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      {updated ? (
        <p className="mt-3 font-mono text-xs text-fg-subtle">
          Last updated <time dateTime={updated}>{formatDate(updated)}</time> ·
          Version {updated}
        </p>
      ) : null}
      {intro ? <div className="legal-prose mt-6">{intro}</div> : null}

      {sections.length > 2 ? (
        <nav
          aria-label="On this page"
          className="mt-8 rounded-lg border border-line bg-ink-900 p-5"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            On this page
          </p>
          <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-flex min-h-8 items-baseline gap-2 text-fg-muted hover:text-accent"
                >
                  <span className="font-mono text-xs text-fg-subtle">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      {sections.map((section, index) => (
        <section
          key={section.id}
          aria-labelledby={section.id}
          className="mt-10 scroll-mt-24"
        >
          <h2
            id={section.id}
            className="flex items-baseline gap-3 text-xl font-semibold tracking-tight"
          >
            <span className="font-mono text-sm text-accent">
              {String(index + 1).padStart(2, '0')}
            </span>
            {section.title}
          </h2>
          <div className="legal-prose mt-3">{section.body}</div>
        </section>
      ))}

      <nav
        aria-label={isIndex ? 'Policies' : 'Other policies'}
        className={isIndex ? 'mt-8' : 'mt-14 border-t border-line pt-8'}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
          {isIndex ? 'Policies' : 'Other policies'}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {others.map((doc) => (
            <li key={doc.path}>
              <a
                href={doc.path}
                className="group flex h-full items-start justify-between gap-3 rounded-lg border border-line bg-ink-900 p-4 hover:border-line-strong"
              >
                <span>
                  <span className="block font-medium group-hover:text-accent">
                    {doc.title}
                  </span>
                  <span className="mt-1 block text-sm text-fg-muted">
                    {doc.summary}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-fg-subtle group-hover:text-accent"
                />
              </a>
            </li>
          ))}
          {path === '/contact' ? null : (
            <li>
              <a
                href="/contact"
                className="group flex h-full items-start justify-between gap-3 rounded-lg border border-line bg-ink-900 p-4 hover:border-line-strong"
              >
                <span>
                  <span className="block font-medium group-hover:text-accent">
                    Contact
                  </span>
                  <span className="mt-1 block text-sm text-fg-muted">
                    Orders, returns, privacy and other questions.
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0 text-fg-subtle group-hover:text-accent"
                />
              </a>
            </li>
          )}
        </ul>
        <a
          href="/"
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm text-fg-muted hover:text-accent"
        >
          ← Back to the store
        </a>
      </nav>
    </article>
  );
}
