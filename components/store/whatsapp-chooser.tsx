'use client';

import clsx from 'clsx';
import { ChevronRight, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { WHATSAPP_CONTACTS, whatsappLabel, whatsappLink } from '@/lib/contacts';
import { buttonClass } from '@/components/ui/button';
import { Modal } from '@/components/ui/overlay';

/** Button that lets the shopper pick who to message; the text is pre-filled. */
export function WhatsAppChooser({
  message,
  label,
  title = 'Message us on WhatsApp',
  description = 'Choose who to message. WhatsApp opens with the details already written.',
  variant = 'whatsapp',
  disabled = false,
  className,
}: {
  message: () => string;
  label: string;
  title?: string;
  description?: string;
  variant?: 'whatsapp' | 'secondary';
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => {
          setText(message());
          setOpen(true);
        }}
        className={
          variant === 'whatsapp'
            ? clsx(
                'inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#25d366] px-5 font-semibold text-[#04150b] hover:bg-[#1fbe5b] disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-fg-subtle',
                className,
              )
            : buttonClass('secondary', 'lg', clsx('justify-center', className))
        }
      >
        <MessageCircle aria-hidden="true" className="size-5" />
        {label}
      </button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
      >
        <ul className="grid gap-3">
          {WHATSAPP_CONTACTS.map((contact) => (
            <li key={contact.phone}>
              <a
                href={whatsappLink(contact.phone, text)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="flex min-h-16 items-center gap-3 rounded-md border border-line-strong bg-ink-850 p-4 hover:border-[#25d366]/60"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#25d366] text-[#04150b]">
                  <MessageCircle aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{contact.name}</span>
                  <span className="block font-mono text-sm text-fg-muted">
                    {whatsappLabel(contact.phone)}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 text-fg-subtle"
                />
                <span className="sr-only">(opens WhatsApp)</span>
              </a>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
