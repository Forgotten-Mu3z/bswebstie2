import { Camera, MessageCircle } from 'lucide-react';
import { WHATSAPP_CONTACTS, whatsappLabel, whatsappLink } from '@/lib/contacts';
import { BUSINESS, businessName } from '@/lib/business';
import { LEGAL_DOCS } from '@/lib/legal';
import { INSTAGRAM_URL } from '@/lib/seo';
import type { NavCategory } from './site-header';

const ROLE: Record<string, string> = { '96879970799': 'PC builds' };

export function SiteFooter({ categories }: { categories: NavCategory[] }) {
  const heading =
    'font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle';
  const link = 'text-sm text-fg-muted hover:text-fg';
  return (
    <footer className="mt-20 border-t border-line bg-ink-900">
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <p className="text-[15px] font-bold tracking-[0.2em]">BLACKSHARK</p>
          <p className="mt-3 max-w-xs text-sm leading-6 text-fg-muted">
            Gaming PCs, parts and gear in Oman. Prices in OMR, stock shown live.
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm text-fg-muted hover:text-fg"
          >
            <Camera aria-hidden="true" className="size-4" /> @blackshark__gaming
            <span className="sr-only">on Instagram (opens a new tab)</span>
          </a>
        </div>
        <nav aria-label="Shop">
          <p className={heading}>Shop</p>
          <ul className="mt-4 grid gap-2.5">
            {categories.map((category) => (
              <li key={category.slug}>
                <a href={`/categories/${category.slug}`} className={link}>
                  {category.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Tools">
          <p className={heading}>Tools</p>
          <ul className="mt-4 grid gap-2.5">
            <li>
              <a href="/build" className={link}>
                Build a PC
              </a>
            </li>
            <li>
              <a href="/deals" className={link}>
                Deals
              </a>
            </li>
            <li>
              <a href="/search" className={link}>
                All products
              </a>
            </li>
          </ul>
        </nav>
        <div>
          <p className={heading}>Contact on WhatsApp</p>
          <ul className="mt-4 grid gap-2">
            {WHATSAPP_CONTACTS.map((contact) => (
              <li key={contact.phone}>
                <a
                  href={whatsappLink(contact.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-md py-1.5 hover:text-fg"
                >
                  <MessageCircle
                    aria-hidden="true"
                    className="size-4 shrink-0 text-ok"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm">
                      {contact.name}
                      {ROLE[contact.phone] ? (
                        <span className="text-fg-subtle">
                          {' '}
                          · {ROLE[contact.phone]}
                        </span>
                      ) : null}
                    </span>
                    <span className="block font-mono text-xs text-fg-subtle">
                      {whatsappLabel(contact.phone)}
                    </span>
                  </span>
                  <span className="sr-only">(opens WhatsApp)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {[...LEGAL_DOCS, { path: '/contact', label: 'Contact' }].map(
                (doc) => (
                  <li key={doc.path}>
                    <a
                      href={doc.path}
                      className="inline-flex min-h-9 items-center text-xs text-fg-muted hover:text-fg"
                    >
                      {doc.label}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </nav>
          <p className="font-mono text-xs text-fg-subtle">
            © {new Date().getFullYear()} {businessName()} · {BUSINESS.country}
          </p>
        </div>
      </div>
    </footer>
  );
}
