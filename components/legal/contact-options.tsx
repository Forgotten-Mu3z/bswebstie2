import { Mail, MessageCircle } from 'lucide-react';
import { BUSINESS } from '@/lib/business';
import { WHATSAPP_CONTACTS, whatsappLabel, whatsappLink } from '@/lib/contacts';

/** The ways to reach the store, as a list. Shows only confirmed details. */
export function ContactOptions() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {WHATSAPP_CONTACTS.map((contact) => (
        <li key={contact.phone}>
          <a
            href={whatsappLink(contact.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full items-center gap-3 rounded-lg border border-line bg-ink-900 p-4 hover:border-line-strong"
          >
            <MessageCircle
              aria-hidden="true"
              className="size-5 shrink-0 text-ok"
            />
            <span className="min-w-0">
              <span className="block font-medium">{contact.name}</span>
              <span className="block font-mono text-xs text-fg-subtle">
                WhatsApp {whatsappLabel(contact.phone)}
              </span>
            </span>
            <span className="sr-only">(opens WhatsApp)</span>
          </a>
        </li>
      ))}
      {BUSINESS.supportEmail ? (
        <li>
          <a
            href={`mailto:${BUSINESS.supportEmail}`}
            className="flex h-full items-center gap-3 rounded-lg border border-line bg-ink-900 p-4 hover:border-line-strong"
          >
            <Mail aria-hidden="true" className="size-5 shrink-0 text-accent" />
            <span className="min-w-0">
              <span className="block font-medium">Email</span>
              <span className="block break-all font-mono text-xs text-fg-subtle">
                {BUSINESS.supportEmail}
              </span>
            </span>
          </a>
        </li>
      ) : null}
    </ul>
  );
}

/** "on WhatsApp" or "on WhatsApp or by email at ..." for running text. */
export function contactPhrase() {
  return BUSINESS.supportEmail
    ? `on WhatsApp or by email at ${BUSINESS.supportEmail}`
    : 'on WhatsApp';
}
