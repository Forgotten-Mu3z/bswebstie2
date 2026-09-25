import { FORM_FACTORS, socketLabel, type PartType } from './catalog';
import type { PublicProduct } from './products';

// PC builder compatibility rules. They check the attributes listed in the
// catalog only; case clearance and cooler mounting still need a human check.

export type Slot =
  | 'cpu'
  | 'motherboard'
  | 'memory'
  | 'gpu'
  | 'storage'
  | 'cooler'
  | 'psu'
  | 'case'
  // Optional extras
  | 'storage2'
  | 'fans'
  | 'network'
  | 'capture'
  | 'extras'
  | 'monitor'
  | 'gear';

export type Build = Partial<Record<Slot, string>>;

export type SlotInfo = {
  key: Slot;
  label: string;
  hint: string;
  /** Filled from this PC part type… */
  partType?: PartType;
  /** …or from this store category (monitors, gaming gear). */
  category?: string;
  /** Extras are not needed for a working PC. */
  optional?: boolean;
};

export const SLOTS: SlotInfo[] = [
  {
    key: 'cpu',
    label: 'Processor',
    partType: 'processor',
    hint: 'Sets the socket for the motherboard.',
  },
  {
    key: 'motherboard',
    label: 'Motherboard',
    partType: 'motherboard',
    hint: 'Must match the processor socket.',
  },
  {
    key: 'memory',
    label: 'Memory',
    partType: 'memory',
    hint: 'Must match the motherboard memory type.',
  },
  {
    key: 'gpu',
    label: 'Graphics card',
    partType: 'graphics-card',
    hint: 'Sets the power supply you need, and your FPS.',
  },
  {
    key: 'storage',
    label: 'Storage',
    partType: 'storage',
    hint: 'Space for Windows, games and files.',
  },
  {
    key: 'cooler',
    label: 'CPU cooler',
    partType: 'cpu-cooler',
    hint: 'Keeps the processor at full speed.',
  },
  {
    key: 'psu',
    label: 'Power supply',
    partType: 'power-supply',
    hint: 'Must meet the graphics card’s recommendation.',
  },
  {
    key: 'case',
    label: 'Case',
    partType: 'case',
    hint: 'Must fit the motherboard size.',
  },
  {
    key: 'storage2',
    label: 'Extra storage',
    partType: 'storage',
    optional: true,
    hint: 'A second drive for more games.',
  },
  {
    key: 'fans',
    label: 'Case fans',
    partType: 'case-fan',
    optional: true,
    hint: 'More airflow and lighting.',
  },
  {
    key: 'network',
    label: 'Wi-Fi & network',
    partType: 'network-card',
    optional: true,
    hint: 'Wireless internet if the board has none.',
  },
  {
    key: 'capture',
    label: 'Capture card',
    partType: 'capture-card',
    optional: true,
    hint: 'For recording or streaming consoles.',
  },
  {
    key: 'extras',
    label: 'Build extras',
    partType: 'accessory',
    optional: true,
    hint: 'Thermal paste, cables and other small parts.',
  },
  {
    key: 'monitor',
    label: 'Monitor',
    category: 'monitors',
    optional: true,
    hint: 'Match the refresh rate to your FPS.',
  },
  {
    key: 'gear',
    label: 'Gaming gear',
    category: 'gaming-gear',
    optional: true,
    hint: 'Keyboard, mouse, headset or chair.',
  },
];

export const slotInfo = (slot: Slot) =>
  SLOTS.find((entry) => entry.key === slot)!;

/** Whether a product is the right kind of item for a slot. */
export function matchesSlot(slot: Slot, part: PublicProduct) {
  const info = slotInfo(slot);
  return info.partType
    ? part.partType === info.partType
    : part.categorySlug === info.category;
}

/** Used when a graphics card does not list a recommended PSU. */
export const DEFAULT_PSU_WATTS = 650;

type Parts = Map<string, PublicProduct>;
const pick = (build: Build, slot: Slot, parts: Parts) =>
  build[slot] ? parts.get(build[slot]) : undefined;

/** Which earlier slot must be chosen before this one can be. */
export function prerequisite(slot: Slot): Slot | null {
  if (slot === 'motherboard' || slot === 'cooler') return 'cpu';
  if (slot === 'memory' || slot === 'case') return 'motherboard';
  if (slot === 'psu') return 'gpu';
  return null;
}

export function isUnlocked(slot: Slot, build: Build) {
  const needed = prerequisite(slot);
  return !needed || Boolean(build[needed]);
}

export function fits(
  slot: Slot,
  candidate: PublicProduct,
  build: Build,
  parts: Parts,
) {
  const cpu = pick(build, 'cpu', parts);
  const board = pick(build, 'motherboard', parts);
  const gpu = pick(build, 'gpu', parts);
  const a = candidate.attributes;

  if (slot === 'motherboard' && cpu)
    return Boolean(a.socket && a.socket === cpu.attributes.socket);
  if (slot === 'memory' && board)
    return Boolean(a.memory && a.memory === board.attributes.memory);
  if (slot === 'case' && board) {
    // Unknown sizes are allowed; the summary asks the buyer to confirm.
    if (!a.formFactor || !board.attributes.formFactor) return true;
    return (
      FORM_FACTORS.indexOf(board.attributes.formFactor) <=
      FORM_FACTORS.indexOf(a.formFactor)
    );
  }
  if (slot === 'psu' && gpu)
    return Boolean(
      a.wattage && a.wattage >= (gpu.attributes.psuWatts ?? DEFAULT_PSU_WATTS),
    );
  if (slot === 'cooler' && cpu && a.sockets?.length)
    return Boolean(
      cpu.attributes.socket && a.sockets.includes(cpu.attributes.socket),
    );
  return true;
}

/** Short rule shown on each slot once its prerequisite is chosen. */
export function requirement(slot: Slot, build: Build, parts: Parts) {
  const cpu = pick(build, 'cpu', parts);
  const board = pick(build, 'motherboard', parts);
  const gpu = pick(build, 'gpu', parts);
  if (slot === 'motherboard' && cpu?.attributes.socket)
    return `${socketLabel(cpu.attributes.socket)} socket`;
  if (slot === 'memory' && board?.attributes.memory)
    return `${board.attributes.memory} only`;
  if (slot === 'case' && board?.attributes.formFactor)
    return `Fits ${board.attributes.formFactor}`;
  if (slot === 'psu' && gpu)
    return `${gpu.attributes.psuWatts ?? DEFAULT_PSU_WATTS} W or more`;
  return null;
}

/**
 * Drops parts that no longer fit after an earlier choice changed, and reports
 * which slots were cleared so the page can explain it.
 */
export function normalize(build: Build, parts: Parts) {
  const next: Build = {};
  for (const { key } of SLOTS) {
    const id = build[key];
    const part = id ? parts.get(id) : undefined;
    if (
      part &&
      matchesSlot(key, part) &&
      isUnlocked(key, next) &&
      fits(key, part, next, parts)
    )
      next[key] = id;
  }
  const removed = SLOTS.filter(({ key }) => build[key] && !next[key]).map(
    ({ label }) => label,
  );
  return { build: next, removed };
}

export function buildQuery(build: Build) {
  const query = new URLSearchParams();
  for (const { key } of SLOTS) if (build[key]) query.set(key, build[key]);
  return query.toString();
}

export function buildFromQuery(query: URLSearchParams, parts: Parts): Build {
  const build: Build = {};
  for (const { key } of SLOTS) {
    const id = query.get(key);
    const part = id ? parts.get(id) : undefined;
    // A shared link can say anything; keep only the right kind of part.
    if (id && part && matchesSlot(key, part)) build[key] = id;
  }
  return build;
}
