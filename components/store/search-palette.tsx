'use client';

/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-noninteractive-element-to-interactive-role -- ARIA combobox pattern: <select> and <datalist> cannot show rich suggestions */
import { Dialog } from '@base-ui/react/dialog';
import clsx from 'clsx';
import { ArrowRight, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { formatOMR, PHOTO_NEEDED, type Suggestion } from '@/lib/products';

// Command-palette search: live suggestions, full keyboard support.
export function SearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const onQueryChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      setActive(-1);
    }
  };

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(term)}`,
          {
            signal: controller.signal,
          },
        );
        const data = (await response.json()) as { suggestions?: Suggestion[] };
        setResults(data.suggestions ?? []);
        setActive(-1);
      } catch {
        // Aborted or offline: keep the previous results.
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const goToSearch = () => {
    const term = query.trim();
    window.location.href = term
      ? `/search?q=${encodeURIComponent(term)}`
      : '/search';
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => Math.min(results.length, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => Math.max(-1, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (active >= 0 && active < results.length)
        window.location.href = `/products/${results[active].slug}`;
      else goToSearch();
    }
  };

  const showAllIndex = results.length;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Popup
          initialFocus={inputRef}
          className="fixed inset-x-3 top-[max(1rem,8vh)] z-50 mx-auto max-w-2xl overflow-hidden rounded-lg border border-line-strong bg-ink-900 shadow-2xl shadow-black/70 outline-none"
        >
          <Dialog.Title className="sr-only">Search products</Dialog.Title>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search
              aria-hidden="true"
              className="size-5 shrink-0 text-fg-subtle"
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={onKeyDown}
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={listId}
              aria-activedescendant={
                active >= 0 ? `${listId}-${active}` : undefined
              }
              aria-autocomplete="list"
              aria-label="Search products, brands or SKU"
              placeholder="Search products, brands or SKU"
              maxLength={100}
              enterKeyHint="search"
              className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
            />
            <kbd className="pointer-coarse:hidden hidden rounded-sm border border-line-strong px-1.5 py-0.5 font-mono text-[11px] text-fg-subtle sm:block">
              Esc
            </kbd>
          </div>

          <ul
            id={listId}
            role="listbox"
            aria-label="Suggestions"
            className="max-h-[60dvh] overflow-y-auto p-2 empty:hidden"
          >
            {results.map((item, index) => (
              <li
                key={item.slug}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={active === index}
              >
                <a
                  href={`/products/${item.slug}`}
                  tabIndex={-1}
                  onMouseEnter={() => setActive(index)}
                  className={clsx(
                    'flex items-center gap-3 rounded-md p-2',
                    active === index ? 'bg-ink-800' : 'hover:bg-ink-850',
                  )}
                >
                  {/* oxlint-disable-next-line nextjs/no-img-element -- tiny thumbnail in a live list */}
                  <img
                    src={item.image ?? PHOTO_NEEDED}
                    alt=""
                    width={44}
                    height={44}
                    className="size-11 shrink-0 rounded-sm bg-ink-850 object-contain p-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {item.name}
                    </span>
                    <span className="block truncate font-mono text-xs text-fg-subtle">
                      {item.brand ?? 'BLACKSHARK'} ·{' '}
                      {item.onRequest
                        ? 'Order on WhatsApp'
                        : item.inStock
                          ? 'In stock'
                          : 'Out of stock'}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular">
                    {formatOMR(item.priceBaisa)}
                  </span>
                </a>
              </li>
            ))}
            {query.trim().length >= 2 ? (
              <li
                id={`${listId}-${showAllIndex}`}
                role="option"
                aria-selected={active === showAllIndex}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={goToSearch}
                  onMouseEnter={() => setActive(showAllIndex)}
                  className={clsx(
                    'flex w-full items-center justify-between rounded-md px-3 py-3 text-left text-sm',
                    active === showAllIndex
                      ? 'bg-ink-800 text-accent'
                      : 'text-fg-muted hover:bg-ink-850',
                  )}
                >
                  {loading
                    ? 'Searching…'
                    : results.length
                      ? `See all results for “${query.trim()}”`
                      : `No quick matches. Search all products for “${query.trim()}”`}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              </li>
            ) : null}
          </ul>
          {query.trim().length < 2 ? (
            <p className="px-3 pb-6 pt-4 text-center text-sm text-fg-subtle">
              Type at least 2 letters. Try “rtx 5070”, “ddr5” or a SKU.
            </p>
          ) : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
