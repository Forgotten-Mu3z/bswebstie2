// Shared catalog vocabulary: PC part types and their structured attributes.
// Used by the store, the PC builder, and the admin editor.

export const PART_TYPES = [
  { value: 'processor', label: 'Processors', single: 'Processor' },
  { value: 'motherboard', label: 'Motherboards', single: 'Motherboard' },
  { value: 'memory', label: 'Memory', single: 'Memory' },
  { value: 'graphics-card', label: 'Graphics cards', single: 'Graphics card' },
  { value: 'storage', label: 'Storage', single: 'Storage' },
  { value: 'power-supply', label: 'Power supplies', single: 'Power supply' },
  { value: 'case', label: 'PC cases', single: 'PC case' },
  { value: 'cpu-cooler', label: 'CPU coolers', single: 'CPU cooler' },
  { value: 'case-fan', label: 'Case fans', single: 'Case fan' },
  { value: 'network-card', label: 'Networking', single: 'Network card' },
  { value: 'capture-card', label: 'Capture cards', single: 'Capture card' },
  { value: 'accessory', label: 'Build accessories', single: 'Accessory' },
] as const;

export type PartType = (typeof PART_TYPES)[number]['value'];

export const SORTS = {
  featured: 'Featured',
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  name: 'Name',
} as const;
export type Sort = keyof typeof SORTS;

export const SOCKETS = ['AM4', 'AM5', 'LGA1700', 'LGA1851'] as const;
export const MEMORY_TYPES = ['DDR4', 'DDR5'] as const;
/** Smallest to largest board size. A case fits boards up to its own size. */
export const FORM_FACTORS = ['Mini-ITX', 'Micro-ATX', 'ATX', 'E-ATX'] as const;

export type Socket = (typeof SOCKETS)[number];
export type MemoryType = (typeof MEMORY_TYPES)[number];
export type FormFactor = (typeof FORM_FACTORS)[number];

export type Attributes = {
  socket?: Socket;
  memory?: MemoryType;
  formFactor?: FormFactor;
  /** Power supply output. */
  wattage?: number;
  /** Graphics card: recommended power supply size. */
  psuWatts?: number;
  /** CPU cooler: supported sockets (empty = not listed). */
  sockets?: Socket[];
};

/** Which attribute fields apply to each part type (drives the admin form). */
export const ATTRIBUTE_FIELDS: Partial<Record<PartType, (keyof Attributes)[]>> =
  {
    processor: ['socket'],
    motherboard: ['socket', 'memory', 'formFactor'],
    memory: ['memory'],
    'graphics-card': ['psuWatts'],
    'power-supply': ['wattage'],
    case: ['formFactor'],
    'cpu-cooler': ['sockets'],
  };

export function isPartType(value: unknown): value is PartType {
  return PART_TYPES.some((type) => type.value === value);
}

export function partTypeLabel(value: string | null, single = true) {
  const type = PART_TYPES.find((entry) => entry.value === value);
  return type ? (single ? type.single : type.label) : null;
}

const oneOf = <T extends string>(list: readonly T[], value: unknown) =>
  list.includes(value as T) ? (value as T) : undefined;
const watts = (value: unknown) =>
  Number.isInteger(value) &&
  (value as number) >= 100 &&
  (value as number) <= 3000
    ? (value as number)
    : undefined;

/** Parses stored JSON and drops anything unexpected. */
export function parseAttributes(raw: unknown): Attributes {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== 'object') return {};
  const input = value as Record<string, unknown>;
  const result: Attributes = {
    socket: oneOf(SOCKETS, input.socket),
    memory: oneOf(MEMORY_TYPES, input.memory),
    formFactor: oneOf(FORM_FACTORS, input.formFactor),
    wattage: watts(input.wattage),
    psuWatts: watts(input.psuWatts),
    sockets: Array.isArray(input.sockets)
      ? [
          ...new Set(
            input.sockets
              .map((socket) => oneOf(SOCKETS, socket))
              .filter((socket): socket is Socket => Boolean(socket)),
          ),
        ]
      : undefined,
  };
  return Object.fromEntries(
    Object.entries(result).filter(
      ([, entry]) =>
        entry !== undefined && !(Array.isArray(entry) && !entry.length),
    ),
  ) as Attributes;
}

export function socketLabel(socket: Socket) {
  return socket.startsWith('LGA') ? `LGA ${socket.slice(3)}` : socket;
}

/** Rows for a product's spec sheet. */
export function attributeRows(attributes: Attributes) {
  const rows: { label: string; value: string }[] = [];
  if (attributes.socket)
    rows.push({ label: 'Socket', value: socketLabel(attributes.socket) });
  if (attributes.memory)
    rows.push({ label: 'Memory', value: attributes.memory });
  if (attributes.formFactor)
    rows.push({ label: 'Form factor', value: attributes.formFactor });
  if (attributes.wattage)
    rows.push({ label: 'Output', value: `${attributes.wattage} W` });
  if (attributes.psuWatts)
    rows.push({
      label: 'Recommended PSU',
      value: `${attributes.psuWatts} W or more`,
    });
  if (attributes.sockets?.length)
    rows.push({
      label: 'Sockets',
      value: attributes.sockets.map(socketLabel).join(', '),
    });
  return rows;
}
