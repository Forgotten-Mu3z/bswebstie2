import clsx from 'clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-strong disabled:bg-ink-700 disabled:text-fg-subtle',
  secondary:
    'border border-line-strong bg-ink-850 text-fg hover:border-fg-subtle hover:bg-ink-800 disabled:text-fg-subtle',
  ghost: 'text-fg-muted hover:bg-ink-800 hover:text-fg disabled:text-fg-subtle',
  danger:
    'border border-danger/40 text-danger hover:bg-danger/10 disabled:text-fg-subtle',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'size-11 justify-center',
};

/** Class string for buttons and button-looking links. */
export function buttonClass(
  variant: Variant = 'primary',
  size: Size = 'md',
  extra?: string,
) {
  return clsx(
    'inline-flex shrink-0 items-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
    extra,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type={type}
      className={buttonClass(variant, size, className)}
      {...props}
    />
  );
}
