'use client';

import { Dialog } from '@base-ui/react/dialog';
import clsx from 'clsx';
import { X } from 'lucide-react';

// Accessible overlays (focus trap, Escape to close, labelled) on Base UI.

type OverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

function CloseButton() {
  return (
    <Dialog.Close
      aria-label="Close"
      className="grid size-11 shrink-0 place-items-center rounded-md text-fg-muted hover:bg-ink-800 hover:text-fg"
    >
      <X aria-hidden="true" className="size-5" />
    </Dialog.Close>
  );
}

const backdrop =
  'fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0';

/** Centered dialog. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: OverlayProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdrop} />
        <Dialog.Popup
          className={clsx(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[min(90dvh,860px)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-line-strong bg-ink-900 shadow-2xl shadow-black/60 outline-none transition duration-200 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0',
            // A width passed in replaces the default instead of fighting it.
            className?.includes('max-w-') ? null : 'max-w-lg',
            className,
          )}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1 pt-1">
              <Dialog.Title className="text-lg font-semibold text-fg">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-fg-muted">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <CloseButton />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
            {children}
          </div>
          {footer ? (
            <div className="border-t border-line px-5 py-4">{footer}</div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Side panel (cart, wishlist, menu, filters). */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = 'right',
  className,
}: OverlayProps & { side?: 'left' | 'right' }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdrop} />
        <Dialog.Popup
          className={clsx(
            'fixed inset-y-0 z-50 flex w-[min(92vw,26rem)] flex-col border-line-strong bg-ink-900 shadow-2xl shadow-black/60 outline-none transition-transform duration-200',
            side === 'right'
              ? 'right-0 border-l data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full'
              : 'left-0 border-r data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full',
            className,
          )}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1 pt-1">
              <Dialog.Title className="text-lg font-semibold text-fg">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-fg-muted">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <CloseButton />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </div>
          {footer ? (
            <div className="border-t border-line p-5">{footer}</div>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
