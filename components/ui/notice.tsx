/** Polite live region for short status messages (cart, builder, admin). */
export function Notice({
  message,
  className = '',
}: {
  message: string;
  className?: string;
}) {
  return (
    <output
      aria-live="polite"
      className={
        message
          ? `block rounded-md border border-accent/25 bg-accent/8 px-3 py-2 text-sm leading-6 text-fg ${className}`
          : 'sr-only'
      }
    >
      {message}
    </output>
  );
}
