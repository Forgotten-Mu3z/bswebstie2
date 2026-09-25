'use client';

import clsx from 'clsx';
import {
  Check,
  Copy,
  Lock,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { attributeRows, socketLabel } from '@/lib/catalog';
import {
  buildFromQuery,
  buildQuery,
  DEFAULT_PSU_WATTS,
  fits,
  isUnlocked,
  normalize,
  prerequisite,
  requirement,
  SLOTS,
  type Build,
  type Slot,
} from '@/lib/pc-builder';
import { currentPrice, formatOMR, type PublicProduct } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { Price, ProductImage, Stock } from '@/components/ui/bits';
import { Modal } from '@/components/ui/overlay';
import { Notice } from '@/components/ui/notice';
import { useCart } from '@/components/store/cart-store';
import { WhatsAppChooser } from '@/components/store/whatsapp-chooser';

const STORAGE_KEY = 'bsg-build-v1';
const slotLabel = (slot: Slot) =>
  SLOTS.find((entry) => entry.key === slot)!.label;

type CheckItem = { label: string; state: 'ok' | 'confirm' | 'pending' };

/** What the builder verified, and what still needs a human check. */
function compatibility(
  build: Build,
  parts: Map<string, PublicProduct>,
): CheckItem[] {
  const get = (slot: Slot) =>
    build[slot] ? parts.get(build[slot]) : undefined;
  const cpu = get('cpu');
  const board = get('motherboard');
  const memory = get('memory');
  const gpu = get('gpu');
  const psu = get('psu');
  const cooler = get('cooler');
  const pcCase = get('case');
  return [
    {
      label:
        cpu?.attributes.socket && board
          ? `Processor and motherboard: ${socketLabel(cpu.attributes.socket)}`
          : 'Processor and motherboard socket',
      state: cpu && board ? 'ok' : 'pending',
    },
    {
      label:
        board?.attributes.memory && memory
          ? `Memory type: ${board.attributes.memory}`
          : 'Memory type',
      state: board && memory ? 'ok' : 'pending',
    },
    {
      label:
        gpu && psu
          ? `Power: ${psu.attributes.wattage} W for a ${gpu.attributes.psuWatts ?? DEFAULT_PSU_WATTS} W recommendation`
          : 'Power supply size',
      state: gpu && psu ? 'ok' : 'pending',
    },
    {
      label: pcCase
        ? board?.attributes.formFactor && pcCase.attributes.formFactor
          ? `Case fits ${board.attributes.formFactor}`
          : 'Case size not listed. Confirm it fits the board'
        : 'Case and motherboard size',
      state:
        !pcCase || !board
          ? 'pending'
          : board.attributes.formFactor && pcCase.attributes.formFactor
            ? 'ok'
            : 'confirm',
    },
    {
      label: cooler
        ? cooler.attributes.sockets?.length
          ? 'Cooler supports the socket'
          : 'Cooler sockets not listed. Confirm mounting'
        : 'Cooler socket support',
      state:
        !cooler || !cpu
          ? 'pending'
          : cooler.attributes.sockets?.length
            ? 'ok'
            : 'confirm',
    },
  ];
}

function PartPicker({
  slot,
  parts,
  build,
  onChoose,
  onClose,
}: {
  slot: Slot | null;
  parts: PublicProduct[];
  build: Build;
  onChoose: (slot: Slot, id: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const byId = useMemo(
    () => new Map(parts.map((part) => [part.id, part])),
    [parts],
  );
  const info = slot ? SLOTS.find((entry) => entry.key === slot)! : null;
  const ofType = info
    ? parts.filter((part) => part.partType === info.partType)
    : [];
  const compatible = slot
    ? ofType.filter((part) => fits(slot, part, build, byId))
    : [];
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? compatible.filter((part) =>
        `${part.name} ${part.brand ?? ''}`.toLowerCase().includes(needle),
      )
    : compatible;
  const hidden = ofType.length - compatible.length;
  const rule = slot ? requirement(slot, build, byId) : null;

  return (
    <Modal
      open={Boolean(slot)}
      onOpenChange={(open) => {
        if (!open) {
          setQuery('');
          onClose();
        }
      }}
      title={info ? `Choose a ${info.label.toLowerCase()}` : ''}
      description={
        rule
          ? `Showing parts that match: ${rule}.${hidden ? ` ${hidden} ${hidden === 1 ? 'part does' : 'parts do'} not fit and ${hidden === 1 ? 'is' : 'are'} hidden.` : ''}`
          : info?.hint
      }
      className="max-w-2xl"
    >
      {compatible.length > 5 ? (
        <div className="relative mb-4">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
          />
          <label htmlFor="picker-search" className="sr-only">
            Filter parts
          </label>
          <input
            id="picker-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter by name or brand"
            className="h-11 w-full rounded-md border border-line-strong bg-ink-850 pl-9 pr-3 text-sm"
          />
        </div>
      ) : null}
      {shown.length ? (
        <ul className="grid gap-2">
          {shown.map((part) => {
            const selected = slot ? build[slot] === part.id : false;
            const spec = attributeRows(part.attributes)[0];
            return (
              <li key={part.id}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => slot && onChoose(slot, part.id)}
                  className={clsx(
                    'flex w-full items-center gap-4 rounded-md border p-3 text-left transition-colors',
                    selected
                      ? 'border-accent bg-accent/8'
                      : 'border-line bg-ink-850 hover:border-line-strong hover:bg-ink-800',
                  )}
                >
                  <span className="size-16 shrink-0 rounded bg-ink-900 p-1.5">
                    <ProductImage product={part} size={64} decorative />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-medium">
                      {part.name}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {spec ? (
                        <span className="font-mono text-xs text-fg-subtle">
                          {spec.label}: {spec.value}
                        </span>
                      ) : null}
                      <Stock stock={part.stock} />
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Price
                      priceBaisa={part.priceBaisa}
                      salePriceBaisa={part.salePriceBaisa}
                      size="sm"
                      className="justify-end"
                    />
                    {selected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                        <Check aria-hidden="true" className="size-3.5" />{' '}
                        Selected
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-md border border-line bg-ink-850 p-5 text-sm text-fg-muted">
          {compatible.length
            ? 'No parts match that filter.'
            : 'No listed parts fit the parts you already chose. Change an earlier part, or ask us on WhatsApp.'}
        </p>
      )}
    </Modal>
  );
}

export function PcBuilder({
  parts,
  siteUrl,
}: {
  parts: PublicProduct[];
  siteUrl: string;
}) {
  const cart = useCart();
  const byId = useMemo(
    () => new Map(parts.map((part) => [part.id, part])),
    [parts],
  );
  const [build, setBuild] = useState<Build>({});
  const [picking, setPicking] = useState<Slot | null>(null);
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  // Restore from a shared link first, then from this device.
  /* oxlint-disable react/react-compiler -- restore device state after hydration */
  useEffect(() => {
    const fromUrl = buildFromQuery(
      new URLSearchParams(window.location.search),
      byId,
    );
    let initial = fromUrl;
    if (!Object.keys(fromUrl).length) {
      try {
        initial = buildFromQuery(
          new URLSearchParams(localStorage.getItem(STORAGE_KEY) ?? ''),
          byId,
        );
      } catch {
        initial = {};
      }
    }
    const { build: restored, removed } = normalize(initial, byId);
    setBuild(restored);
    if (removed.length)
      setNotice(
        `Some saved parts are no longer available or no longer fit, so they were removed: ${removed.join(', ')}.`,
      );
    setReady(true);
  }, [byId]);
  /* oxlint-enable react/react-compiler */

  // Keep the address bar and this device in sync with the build.
  useEffect(() => {
    if (!ready) return;
    const query = buildQuery(build);
    window.history.replaceState(null, '', query ? `/build?${query}` : '/build');
    try {
      localStorage.setItem(STORAGE_KEY, query);
    } catch {
      // Storage can be blocked; the link still holds the build.
    }
  }, [build, ready]);

  const chosen = SLOTS.flatMap(({ key, label }) => {
    const part = build[key] ? byId.get(build[key]) : undefined;
    return part ? [{ key, label, part }] : [];
  });
  const total = chosen.reduce((sum, { part }) => sum + currentPrice(part), 0);
  const checks = compatibility(build, byId);
  const shareUrl = `${siteUrl}/build${chosen.length ? `?${buildQuery(build)}` : ''}`;

  function update(next: Build, reason: string) {
    const { build: normalized, removed } = normalize(next, byId);
    setBuild(normalized);
    setNotice(
      removed.length
        ? `${reason} ${removed.join(', ')} no longer ${removed.length === 1 ? 'fits' : 'fit'}, so ${removed.length === 1 ? 'it was' : 'they were'} removed.`
        : '',
    );
  }

  function choose(slot: Slot, id: string) {
    setPicking(null);
    update({ ...build, [slot]: id }, `${slotLabel(slot)} changed.`);
  }

  function clear(slot: Slot) {
    const next = { ...build };
    delete next[slot];
    update(next, `${slotLabel(slot)} removed.`);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setNotice(
        'Copying is blocked in this browser. Copy the link from the address bar instead.',
      );
    }
  }

  function addAll() {
    const available = chosen.filter(({ part }) => part.stock > 0);
    for (const { part } of available) cart.add(part, 1);
    const skipped = chosen.length - available.length;
    if (skipped)
      setNotice(
        `${skipped} out-of-stock ${skipped === 1 ? 'part was' : 'parts were'} not added to the cart.`,
      );
  }

  const message = () =>
    [
      "Hi, I'd like a quote for this PC build:",
      '',
      ...chosen.map(
        ({ label, part }) =>
          `• ${label}: ${part.name} (${formatOMR(currentPrice(part))})`,
      ),
      '',
      `Total on the website: ${formatOMR(total)}`,
      `Build link: ${shareUrl}`,
    ].join('\n');

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      <div>
        <Notice message={notice} className="mb-4" />
        <ol className="overflow-hidden rounded-lg border border-line bg-ink-900">
          {SLOTS.map((slot, index) => {
            const part = build[slot.key]
              ? byId.get(build[slot.key]!)
              : undefined;
            const unlocked = isUnlocked(slot.key, build);
            const needed = prerequisite(slot.key);
            const rule = requirement(slot.key, build, byId);
            return (
              <li
                key={slot.key}
                className="border-b border-line last:border-b-0"
              >
                <div className="grid grid-cols-[2.5rem_1fr] gap-x-3 gap-y-3 p-4 sm:grid-cols-[3rem_1fr_auto] sm:items-center sm:p-5">
                  <span
                    aria-hidden="true"
                    className={clsx(
                      'grid size-10 place-items-center rounded-md border font-mono text-sm',
                      part
                        ? 'border-accent/50 bg-accent/10 text-accent'
                        : 'border-line-strong text-fg-subtle',
                    )}
                  >
                    {part ? (
                      <Check className="size-4" />
                    ) : (
                      String(index + 1).padStart(2, '0')
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-semibold">{slot.label}</h3>
                      {rule && !part ? (
                        <span className="font-mono text-xs text-accent">
                          {rule}
                        </span>
                      ) : null}
                    </div>
                    {part ? (
                      <div className="mt-2 flex items-center gap-3">
                        <span className="size-12 shrink-0 rounded bg-ink-850 p-1">
                          <ProductImage product={part} size={48} decorative />
                        </span>
                        <span className="min-w-0">
                          <a
                            href={`/products/${part.slug}`}
                            className="line-clamp-2 text-sm hover:text-accent"
                          >
                            {part.name}
                          </a>
                          <span className="mt-0.5 flex flex-wrap items-center gap-x-3">
                            <span className="font-mono text-sm tabular">
                              {formatOMR(currentPrice(part))}
                            </span>
                            {part.stock < 1 ? <Stock stock={0} /> : null}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-fg-muted">
                        {unlocked
                          ? slot.hint
                          : `Choose a ${slotLabel(needed!).toLowerCase()} first.`}
                      </p>
                    )}
                  </div>
                  <div className="col-start-2 flex gap-2 sm:col-start-3">
                    {unlocked ? (
                      <Button
                        variant={part ? 'secondary' : 'primary'}
                        onClick={() => setPicking(slot.key)}
                      >
                        {part ? (
                          'Change'
                        ) : (
                          <>
                            <Plus aria-hidden="true" className="size-4" />{' '}
                            Choose
                          </>
                        )}
                        <span className="sr-only">
                          {' '}
                          {slot.label.toLowerCase()}
                        </span>
                      </Button>
                    ) : (
                      <span className="inline-flex h-11 items-center gap-2 rounded-md border border-dashed border-line-strong px-4 text-sm text-fg-subtle">
                        <Lock aria-hidden="true" className="size-4" /> Locked
                      </span>
                    )}
                    {part ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${slot.label.toLowerCase()}`}
                        onClick={() => clear(slot.key)}
                      >
                        <X aria-hidden="true" className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <aside
        aria-labelledby="summary-title"
        className="rounded-lg border border-line-strong bg-ink-900 lg:sticky lg:top-32"
      >
        <div className="border-b border-line px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            Build sheet
          </p>
          <h2 id="summary-title" className="mt-1 text-lg font-semibold">
            {chosen.length} of {SLOTS.length} parts chosen
          </h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-fg-muted">Total</p>
          <p className="font-mono text-3xl font-semibold tabular">
            {formatOMR(total)}
          </p>
        </div>
        <div className="border-t border-line px-5 py-4">
          <h3 className="text-sm font-semibold">Compatibility</h3>
          <ul className="mt-3 grid gap-2 text-sm">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2">
                {check.state === 'ok' ? (
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-ok"
                  />
                ) : check.state === 'confirm' ? (
                  <TriangleAlert
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-warn"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-2 shrink-0 rounded-full border border-fg-subtle"
                  />
                )}
                <span
                  className={
                    check.state === 'pending' ? 'text-fg-subtle' : undefined
                  }
                >
                  <span className="sr-only">
                    {check.state === 'ok'
                      ? 'Checked: '
                      : check.state === 'confirm'
                        ? 'Needs confirming: '
                        : 'Not checked yet: '}
                  </span>
                  {check.label}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-fg-subtle">
            These checks use the specs listed in our catalog. Confirm case
            clearance and cooler mounting with us before you buy.
          </p>
        </div>
        <div className="grid gap-2 border-t border-line p-5">
          <WhatsAppChooser
            label="Send build on WhatsApp"
            title="Send this build"
            description="Choose who to send it to. The part list, total and build link are written for you."
            message={message}
            disabled={!chosen.length}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              className="justify-center"
              disabled={!chosen.length}
              onClick={copyLink}
            >
              {copied ? (
                <Check aria-hidden="true" className="size-4" />
              ) : (
                <Copy aria-hidden="true" className="size-4" />
              )}
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button
              variant="secondary"
              className="justify-center"
              disabled={!chosen.length}
              onClick={addAll}
            >
              <ShoppingBag aria-hidden="true" className="size-4" /> Add to cart
            </Button>
          </div>
          {chosen.length ? (
            <Button
              variant="ghost"
              className="justify-center"
              onClick={() => update({}, '')}
            >
              <RotateCcw aria-hidden="true" className="size-4" /> Start over
            </Button>
          ) : null}
        </div>
      </aside>

      <PartPicker
        slot={picking}
        parts={parts}
        build={build}
        onChoose={choose}
        onClose={() => setPicking(null)}
      />
    </div>
  );
}
