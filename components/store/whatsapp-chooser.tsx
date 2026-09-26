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
  ariaLabel,
  title = 'Message us on WhatsApp',
  description = 'Choose who to message. WhatsApp opens with the details already written.',
  variant = 'whatsapp',
  size = 'lg',
  disabled = false,
  className,
}: {
  message: () => string;
  label: string;
  /** Full name for screen readers when the visible label is short. */
  ariaLabel?: string;
  title?: string;
  description?: string;
  variant?: 'whatsapp' | 'secondary';
  size?: 'md' | 'lg';
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
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => {
          setText(message());
          setOpen(true);
        }}
        className={
          variant === 'whatsapp'
            ? clsx(
                'inline-flex items-center justify-center gap-2 rounded-md bg-[#25d366] font-semibold text-[#04150b] hover:bg-[#1fbe5b] disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-fg-subtle',
                size === 'lg' ? 'h-12 px-5' : 'h-11 px-3 text-sm',
                className,
              )
            : buttonClass('secondary', size, clsx('justify-center', className))
        }
      >
        <MessageCircle
          aria-hidden="true"
          className={size === 'lg' ? 'size-5' : 'size-4'}
        />
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
        {/* What the shopper should know before sending an order. */}
        <p className="mt-4 text-xs leading-5 text-fg-subtle">
          Prices and stock are confirmed in the chat before you pay. WhatsApp
          (Meta) shares your name and number with us.{' '}
          <a href="/terms" className="underline hover:text-fg">
            Terms
          </a>
          {' · '}
          <a href="/refunds" className="underline hover:text-fg">
            Returns
          </a>
          {' · '}
          <a href="/privacy" className="underline hover:text-fg">
            Privacy
          </a>
        </p>
      </Modal>
    </>
  );
}
