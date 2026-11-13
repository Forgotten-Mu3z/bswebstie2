// Replaces the whole catalog with the shop's stock export (Items sheet:
// Item No., Title, Total Qty, Price, Category).
//
//   npm run inventory:import -- "<path to the .xlsx export>" drizzle/<NNNN_name>.sql
//
// Writes data/inventory.json (no purchase costs: those columns are never read)
// and the given migration, which deletes every product and brand and inserts
// the export. Apply it with npm run db:migrate:local / db:migrate:remote.
//
// Rules: used items are left out; repairs and services are listed with the
// stock count hidden; items priced 0 become drafts (they cannot be published);
// negative stock counts as 0. A photo is linked when public/products/<slug>.webp
// exists. Specs for the PC builder (socket, memory type, size, wattage) are read
// from model names where the name makes them certain, and left out otherwise.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const [source, migration] = process.argv.slice(2);
if (!source || !migration?.endsWith('.sql')) {
  console.error(
    'Usage: npm run inventory:import -- "<export.xlsx>" drizzle/<NNNN_name>.sql',
  );
  process.exit(1);
}

// --- .xlsx reading (a zip of XML files) ------------------------------------

function unzip(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Not an .xlsx file (no zip directory).');
  const files = new Map();
  let at = buffer.readUInt32LE(end + 16);
  for (let i = 0; i < buffer.readUInt16LE(end + 10); i++) {
    const method = buffer.readUInt16LE(at + 10);
    const size = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const skip =
      nameLength + buffer.readUInt16LE(at + 30) + buffer.readUInt16LE(at + 32);
    const name = buffer.toString('utf8', at + 46, at + 46 + nameLength);
    const local = buffer.readUInt32LE(at + 42);
    const start =
      local +
      30 +
      buffer.readUInt16LE(local + 26) +
      buffer.readUInt16LE(local + 28);
    const data = buffer.subarray(start, start + size);
    files.set(name, () =>
      (method === 8 ? inflateRawSync(data) : data).toString('utf8'),
    );
    at += 46 + skip;
  }
  return files;
}

const decode = (text) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
const texts = (xml) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
    .map((m) => decode(m[1]))
    .join('');

function readSheet(path) {
  const files = unzip(readFileSync(path));
  const shared = files.has('xl/sharedStrings.xml')
    ? [
        ...files
          .get('xl/sharedStrings.xml')()
          .matchAll(/<si>([\s\S]*?)<\/si>/g),
      ].map((m) => texts(m[1]))
    : [];
  const column = (ref) =>
    [...ref.replace(/\d+/g, '')].reduce(
      (n, ch) => n * 26 + ch.charCodeAt(0) - 64,
      0,
    ) - 1;
  const rows = [];
  for (const row of files
    .get('xl/worksheets/sheet1.xml')()
    .matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const cell of row[1].matchAll(
      /<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const ref = /\br="([A-Z]+\d+)"/.exec(cell[1])?.[1];
      if (!ref) continue;
      const type = /\bt="(\w+)"/.exec(cell[1])?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(cell[2] ?? '')?.[1];
      cells[column(ref)] =
        type === 's'
          ? shared[Number(value)]
          : type === 'inlineStr'
            ? texts(cell[2] ?? '')
            : decode(value ?? '');
    }
    rows.push(cells);
  }
  return rows;
}

// --- Store mapping ------------------------------------------------------------

const CATEGORIES = [
  {
    id: 'cat-pc',
    slug: 'pc-components',
    name: 'PC Components',
    description:
      'Processors, graphics cards, memory, storage, cases, cooling and power for your build.',
  },
  {
    id: 'cat-builds',
    slug: 'gaming-pcs',
    name: 'Gaming PCs',
    description: 'Complete gaming systems, ready to play.',
  },
  {
    id: 'cat-gear',
    slug: 'gaming-gear',
    name: 'Gaming Gear',
    description:
      'Keyboards, mice, headsets, chairs, desks, lighting, cables and accessories for your setup.',
  },
  {
    id: 'cat-monitor',
    slug: 'monitors',
    name: 'Monitors',
    description: 'Gaming monitors and projectors.',
  },
  {
    id: 'cat-console',
    slug: 'consoles',
    name: 'Consoles',
    description:
      'PlayStation, Nintendo Switch and handheld consoles, controllers and accessories.',
  },
  {
    id: 'cat-games',
    slug: 'games',
    name: 'Games',
    description: 'PlayStation, Xbox and Nintendo Switch games.',
  },
  {
    id: 'cat-collectibles',
    slug: 'collectibles',
    name: 'Collectibles',
    description: 'Funko Pop! figures and other collectibles.',
  },
  {
    id: 'cat-services',
    slug: 'repairs-services',
    name: 'Repairs & Services',
    description:
      'Console, controller, PC and laptop repairs, servicing and installation.',
  },
  {
    id: 'cat-digital',
    slug: 'digital-cards',
    name: 'Digital Cards',
    description: 'Game and store credit.',
    enabled: false,
  },
];

// Export category -> [store category, part type | null, label for the summary].
const MAP = {
  PROCESSOR: ['cat-pc', 'processor', 'Processor'],
  MOTHERBOARDS: ['cat-pc', 'motherboard', 'Motherboard'],
  RAM: ['cat-pc', 'memory', 'Memory'],
  'PC RAMS': ['cat-pc', 'memory', 'Memory'],
  RAMS: ['cat-pc', 'memory', 'Memory'],
  'GRAPHICS CARD': ['cat-pc', 'graphics-card', 'Graphics card'],
  SSD: ['cat-pc', 'storage', 'Storage drive'],
  'POWER SUPPLY': ['cat-pc', 'power-supply', 'Power supply'],
  'PC CASES': ['cat-pc', 'case', 'PC case'],
  'CPU COOLER': ['cat-pc', 'cpu-cooler', 'CPU cooler'],
  'PC COOLERS': ['cat-pc', 'cpu-cooler', 'CPU cooler'],
  FANS: ['cat-pc', 'case-fan', 'Case fan'],
  'THERMAL PASTE': ['cat-pc', 'accessory', 'Thermal paste'],
  'PC ACESSORIES': ['cat-pc', 'accessory', 'PC accessory'],
  RGB: ['cat-pc', 'accessory', 'RGB lighting'],
  'PC BUILD': ['cat-builds', null, 'Gaming PC'],
  'MOUSE / KEYBOARDS': ['cat-gear', null, 'Keyboard or mouse'],
  'GAMING HEADSETS': ['cat-gear', null, 'Gaming headset'],
  MICROPHONES: ['cat-gear', null, 'Microphone'],
  MOUSEPADS: ['cat-gear', null, 'Mouse pad'],
  CHAIR: ['cat-gear', null, 'Gaming chair'],
  'GAMING CHAIRS': ['cat-gear', null, 'Gaming chair'],
  'GAMING DESKS': ['cat-gear', null, 'Gaming desk'],
  'MONITOR ARMS': ['cat-gear', null, 'Monitor arm'],
  'LED LIGHTS': ['cat-gear', null, 'LED lighting'],
  'SPEAKER/SOUND BAR': ['cat-gear', null, 'Speaker or sound bar'],
  CABLES: ['cat-gear', null, 'Cable'],
  'LAN CABLES': ['cat-gear', null, 'Network cable'],
  ADAPTER: ['cat-gear', null, 'Adapter'],
  HUB: ['cat-gear', null, 'Hub'],
  SOCKTES: ['cat-gear', null, 'Power socket or strip'],
  WIFI: ['cat-gear', null, 'Wi-Fi router'],
  'LAPTOP COOLING': ['cat-gear', null, 'Laptop cooling pad'],
  LAPTOP: ['cat-gear', null, 'Laptop part'],
  COOLERS: ['cat-gear', null, 'Air cooler'],
  FREEZER: ['cat-gear', null, 'Freezer'],
  POS: ['cat-gear', null, 'Barcode scanner'],
  'GAMING MONITOR': ['cat-monitor', null, 'Gaming monitor'],
  'GAMING MONITORS': ['cat-monitor', null, 'Gaming monitor'],
  KOORUI: ['cat-monitor', null, 'Monitor'],
  PROJECTOR: ['cat-monitor', null, 'Projector'],
  PLAYSTATIONS: ['cat-console', null, 'PlayStation console'],
  NS: ['cat-console', null, 'Nintendo Switch console'],
  'HANDHELD CONSOLE': ['cat-console', null, 'Handheld console'],
  'GAME STICK': ['cat-console', null, 'Game stick'],
  JOYSTICKS: ['cat-console', null, 'Controller'],
  'PS5 ACCESSORIES': ['cat-console', null, 'PS5 accessory'],
  'PS ACCESSORIES': ['cat-console', null, 'PlayStation accessory'],
  'NS ACCESSORIES': ['cat-console', null, 'Nintendo Switch accessory'],
  STEERING: ['cat-console', null, 'Racing wheel'],
  'DRIVING WHEEL': ['cat-console', null, 'Racing wheel'],
  'PS4 HDD': ['cat-console', null, 'PS4 hard drive'],
  'PS5 GAMES': ['cat-games', null, 'PlayStation 5 game'],
  'PS5 GAME': ['cat-games', null, 'PlayStation 5 game'],
  'PS5 AGAMES': ['cat-games', null, 'PlayStation 5 game'],
  'PS5 DVD': ['cat-games', null, 'PlayStation 5 game'],
  'PS54 GAMES': ['cat-games', null, 'PlayStation game'],
  'PS4 GAMES': ['cat-games', null, 'PlayStation 4 game'],
  'NS GAMES': ['cat-games', null, 'Nintendo Switch game'],
  'XBOX GAMES': ['cat-games', null, 'Xbox game'],
  'FUNKO POP': ['cat-collectibles', null, 'Funko Pop! collectible'],
  REPAIRING: ['cat-services', null, 'service'],
  'LAPTOP SERVICE': ['cat-services', null, 'service'],
};
// No brand guessed for these: games (publisher not in the export), cables
// (often made for a brand, not by it) and services.
const NO_BRAND = new Set(['cat-games', 'cat-services']);
const NO_BRAND_SOURCE = new Set(['CABLES', 'LAN CABLES']);

// Used items are not listed (owner's choice).
const SKIP = new Set([
  'USED ITEMS',
  'USD PC',
  'PS4 DVD EX USED',
  'PS4 USED DVD',
]);

// Brand when a name starts with or contains one of these (first match wins).
const BRANDS = [
  ['ASUS', /\bASUS\b|\bROG\b/],
  ['MSI', /\bMSI\b/],
  ['Gigabyte', /\bGIGABYTE\b|\bAORUS\b/],
  ['ASRock', /\bASR[OP]CK\b/],
  ['Biostar', /\bBIOSTAR\b/],
  ['Colorful', /\bCOLORFUL\b/],
  ['Palit', /\bPALIT\b/],
  ['PNY', /\bPNY\b/],
  ['Zotac', /\bZOTAC\b/],
  ['Inno3D', /\bINNO3D\b/],
  ['Manli', /\bMANLI\b/],
  ['Sapphire', /\bSAPPHIRE\b/],
  ['Intel', /\bINTEL\b|\bI[3579] ?- ?\d{4,5}|\bULTRA [579]\b/],
  ['AMD', /\bRYZEN\b|\bAMD\b/],
  ['Kingston', /\bKINGST?ON\b/],
  ['XPG', /\bXPG\b/],
  ['TeamGroup', /\bT ?-?FORCE\b|\bTEAM ?GROUP\b/],
  ['Lexar', /\bLEXA[E]?R\b/],
  ['Addlink', /\bADDLINK\b/],
  ['AGI', /\bAGI\b/],
  ['Acer', /\bACER\b|\bPREDATOR\b/],
  ['WD', /\bWD\b/],
  ['Hiksemi', /\bHIKSEMI\b/],
  ['Hikvision', /\bHIKVISION\b/],
  ['Biwin', /\bBIWIN\b/],
  ['Verbatim', /\bVERBATIM\b/],
  ['Xigmatex', /\bXIGMATEX\b/],
  ['Tortox', /\bTORTOX\b/],
  ['Aigo', /\bAIGO\b/],
  ['Darkflash', /\bDARKFLASH\b|^DK[\s-]|^DF\b/],
  ['DeepCool', /\bDEEPCOOL\b/],
  ['Lian Li', /\bLIAN LI\b/],
  ['Arctic', /\bARCTIC MX/],
  ['Cooler Master', /\bCOOLER MASTER\b/],
  ['Antec', /\bANTEC\b/],
  ['LovingCool', /\bLOVING ?COOL\b/],
  ['Tryx', /\bTRYX\b/],
  ['GAMEON', /\bGAMEON\b|^GO-?(?!FROST)[A-Z]/],
  ['Twisted Minds', /\bTWISTED MINDS\b|^TM[-\d]/],
  ['K GAMING', /\bK ?GAMING\b|^KGS?-/],
  ['KOORUI', /\bKOORUI\b/],
  ['Sansui', /\bSANSUI\b/],
  ['Logitech', /\bLOGITECH\b/],
  ['Razer', /\bRAZER\b/],
  ['HyperX', /\bHYPER ?X\b/],
  ['Corsair', /\bCORSAIR\b/],
  ['SteelSeries', /\bSTEEL ?SERIES\b/],
  ['Redragon', /\bREDRAGON\b/],
  ['Fantech', /\bFANTECH\b/],
  ['Astro', /\bASTRO A\d+\b/],
  ['HORI', /\bHORI\b/],
  ['Porodo', /\bPORODO\b|\bPRODOO\b/],
  ['Aurzen', /\bAURZEN\b/],
  ['GL.iNet', /\bFLINT \d\b/],
  ['Nintendo', /\bNINTENDO\b/],
  ['Sony', /\bDUALSENSE\b|\bPLAYSTATION PORTAL\b/],
  ['Funko', /\bFUNKO\b/],
  ['Thrustmaster', /\bTHRUSTMASTER\b/],
  ['Fanatec', /\bFANATEC\b/],
  ['Gamesir', /\bGAME ?SIR\b/],
  ['Glorious', /\bGLORIOUS\b/],
  ['Maono', /\bMAONO\b/],
  ['Fifine', /\bFIFINE\b/],
];

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/[_\s-]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';

// Specs read from model names, only where the name decides them.
function specs(partType, name) {
  const t = name.toUpperCase();
  const a = {};
  if (partType === 'processor') {
    if (/ULTRA [579]\s*2\d\d/.test(t)) a.socket = 'LGA1851';
    else if (
      /\bI[3579]\s*-?\s*1[234]\d{3}/.test(t) ||
      /\b1[234]\d{3}[FK]{0,2}\b/.test(t)
    )
      a.socket = 'LGA1700';
    else if (
      /RYZEN \d\s*[79]\d{3}|\b[79]\d{3}\s*X\s*3D\b|\b7[56]00F?\b/.test(t)
    )
      a.socket = 'AM5';
    else if (/RYZEN \d\s*5\d{3}\b/.test(t)) a.socket = 'AM4';
  }
  if (partType === 'motherboard') {
    const chip = /\b([ABHXZ])(\d{3})(M|I)?\b/.exec(t.replace(/[-/]/g, ' '));
    if (chip) {
      const model = chip[1] + chip[2];
      if (/^(H610|B660|B760|H670|Z690|Z790)$/.test(model)) a.socket = 'LGA1700';
      else if (/^(Z890|B860|H810)$/.test(model)) a.socket = 'LGA1851';
      else if (/^(A620|B650|X670|B840|B850|X870)$/.test(model))
        a.socket = 'AM5';
      else if (/^(A520|B450|B550|X570)$/.test(model)) a.socket = 'AM4';
      // Size only when the name says it (an "M" or "I" after the chipset);
      // boards without one come in several sizes.
      if (a.socket && chip[3])
        a.formFactor = chip[3] === 'M' ? 'Micro-ATX' : 'Mini-ITX';
    }
    if (/\bDD?R?4\b|\/D4\b|-D4\b|\bD4\b/.test(t)) a.memory = 'DDR4';
    else if (/\bDD?R?5\b|\/D5\b|-D5\b|\bD5\b/.test(t)) a.memory = 'DDR5';
    else if (a.socket === 'AM5' || a.socket === 'LGA1851') a.memory = 'DDR5';
    else if (a.socket === 'AM4') a.memory = 'DDR4';
  }
  if (partType === 'memory') {
    if (/\bDDR4\b|\bD4\b/.test(t)) a.memory = 'DDR4';
    else if (/\bDDR5\b|\bD5\b/.test(t)) a.memory = 'DDR5';
    else if (/\b(5200|5600|6000|6400|7200)\s*(MHZ|MT)?/.test(t))
      a.memory = 'DDR5';
    else if (/\b(2666|3000|3200|3600)\s*(MHZ|MT)?/.test(t)) a.memory = 'DDR4';
  }
  if (partType === 'power-supply') {
    const watts = /(\d{3,4})\s*W\b|-(\d{3,4})$/.exec(t);
    const value = Number(watts?.[1] ?? watts?.[2]);
    if (value >= 300 && value <= 2000) a.wattage = value;
  }
  return a;
}

// --- Build ------------------------------------------------------------------------

const rows = readSheet(source);
const header = rows.findIndex((row) =>
  row.some((cell) => /^Item No\.?$/i.test(cell ?? '')),
);
if (header < 0) throw new Error('No "Item No." header row found.');
const col = (label) =>
  rows[header].findIndex((cell) => (cell ?? '').trim().toLowerCase() === label);
const C = {
  no: col('item no.'),
  title: col('title'),
  qty: col('total qty'),
  price: col('price'),
  category: col('category'),
};
if (Object.values(C).some((index) => index < 0))
  throw new Error(`Missing columns: ${JSON.stringify(C)}`);

const unknown = new Set();
const skipped = [];
const items = [];
for (const row of rows.slice(header + 1)) {
  const no = String(row[C.no] ?? '').trim();
  const title = String(row[C.title] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  const category = String(row[C.category] ?? '')
    .trim()
    .toUpperCase();
  if (!no || !title) continue;
  if (SKIP.has(category) || /\bUSED\b/i.test(title)) {
    skipped.push(title);
    continue;
  }
  let mapping = MAP[category];
  if (!mapping) {
    unknown.add(category);
    continue;
  }
  // Misfiled processor (an "old stock" CPU in the graphics card list).
  if (
    mapping[1] === 'graphics-card' &&
    /\bI[3579]\s*-?\s*\d{4,5}F?\b/i.test(title)
  )
    mapping = MAP.PROCESSOR;
  const price = Number(row[C.price] ?? 0) || 0;
  const qty = Math.max(0, Math.floor(Number(row[C.qty] ?? 0) || 0));
  items.push({ no, title, qty, price, sourceCategory: category, mapping });
}
if (unknown.size) {
  console.error(
    `Categories with no store mapping (add them to MAP): ${[...unknown].join(', ')}`,
  );
  process.exit(1);
}

// CPU makers only for processors and graphics cards ("... HOLDER AMD" is not).
const CHIP_MAKERS = new Set(['AMD', 'Intel']);
const brandOf = (item) => {
  if (NO_BRAND.has(item.mapping[0]) || NO_BRAND_SOURCE.has(item.sourceCategory))
    return null;
  if (item.sourceCategory === 'PLAYSTATIONS') return 'Sony';
  // The Funko Pop! export also lists Nintendo amiibo figures.
  if (item.sourceCategory === 'FUNKO POP')
    return /\bAMIIBO\b/i.test(item.title) ? 'Nintendo' : 'Funko';
  const title = item.title.toUpperCase();
  const chip =
    item.mapping[1] === 'processor' || item.mapping[1] === 'graphics-card';
  // The brand named first wins ("GAMEON Sapphire desk" is GAMEON).
  let best = null;
  for (const [name, pattern] of BRANDS) {
    if (CHIP_MAKERS.has(name) && !chip) continue;
    const at = title.search(pattern);
    if (at >= 0 && (!best || at < best.at)) best = { name, at };
  }
  return best?.name ?? null;
};
const slugs = new Map();
const products = items.map((item) => {
  let slug = slugify(item.title).slice(0, 80).replace(/-$/, '');
  if (slugs.has(slug)) slug = `${slug}-${item.no}`;
  slugs.set(slug, true);
  const [categoryId, partType, label] = item.mapping;
  const service = categoryId === 'cat-services';
  const brand = brandOf(item);
  // Brand stays out of the text: it is a guess from the name, used for filters.
  const summary = service
    ? 'From our repairs and services list. Message us on WhatsApp to book or to ask about it.'
    : `${label}. Message us on WhatsApp for full details.`;
  const photo = existsSync(`public/products/${slug}.webp`)
    ? `/products/${slug}.webp`
    : null;
  return {
    id: `inv-${item.no}`,
    slug,
    sku: item.no,
    name: item.title,
    summary,
    categoryId,
    brand,
    partType,
    attributes: partType ? specs(partType, item.title) : {},
    priceBaisa: Math.round(item.price * 1000),
    stock: service ? 0 : item.qty,
    stockOnRequest: service,
    status: item.price > 0 ? 'PUBLISHED' : 'DRAFT',
    imageKey: photo,
  };
});

const brandList = [
  ...new Set(products.map((p) => p.brand).filter(Boolean)),
].sort();
const brandId = (name) => `brand-${slugify(name)}`;
const q = (value) =>
  value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;

const statements = [
  "-- Catalog replaced with the shop's stock export. Generated by\n-- scripts/import-inventory.mjs from data/inventory.json; do not edit by hand.\nDELETE FROM products;",
  'DELETE FROM brands;',
  ...CATEGORIES.map(
    (c, index) =>
      `INSERT INTO categories (id, slug, name, description, sort_order, enabled) VALUES (${q(c.id)}, ${q(c.slug)}, ${q(c.name)}, ${q(c.description)}, ${index + 1}, ${c.enabled === false ? 0 : 1})\nON CONFLICT(id) DO UPDATE SET slug = excluded.slug, name = excluded.name, description = excluded.description, sort_order = excluded.sort_order, enabled = excluded.enabled;`,
  ),
  `DELETE FROM categories WHERE id NOT IN (${CATEGORIES.map((c) => q(c.id)).join(', ')});`,
  `INSERT INTO brands (id, slug, name) VALUES\n${brandList.map((name) => `(${q(brandId(name))}, ${q(slugify(name))}, ${q(name)})`).join(',\n')};`,
];
// D1 limits one statement to 100 KB: insert in small batches.
for (let i = 0; i < products.length; i += 40) {
  const values = products
    .slice(i, i + 40)
    .map(
      (p) =>
        `(${[q(p.id), q(p.slug), q(p.sku), q(p.name), "''", q(p.summary), q(p.categoryId), p.brand ? q(brandId(p.brand)) : 'NULL', q(p.partType), q(JSON.stringify(p.attributes)), p.priceBaisa, 'NULL', p.stock, p.stockOnRequest ? 1 : 0, 2, q(p.status), 0, q(p.imageKey), 'NULL', 'unixepoch()', 'unixepoch()'].join(', ')})`,
    );
  statements.push(
    `INSERT INTO products (id, slug, sku, name, name_ar, summary, category_id, brand_id, part_type, attributes, price_baisa, sale_price_baisa, stock, stock_on_request, low_stock_threshold, status, featured, image_key, source_url, created_at, updated_at) VALUES\n${values.join(',\n')};`,
  );
}
writeFileSync(
  migration,
  `${statements.join('\n--> statement-breakpoint\n')}\n`,
);
writeFileSync(
  'data/inventory.json',
  `${JSON.stringify(
    {
      _about:
        "Store catalog from the shop's stock export (no purchase costs). Regenerate with npm run inventory:import.",
      products: products.map(
        ({
          id,
          slug,
          sku,
          name,
          categoryId,
          brand,
          partType,
          attributes,
          priceBaisa,
          stock,
          status,
        }) => ({
          id,
          slug,
          sku,
          name,
          categoryId,
          brand,
          partType,
          attributes,
          priceBaisa,
          stock,
          status,
        }),
      ),
    },
    null,
    1,
  )}\n`,
);

const count = (fn) => products.filter(fn).length;
console.log(
  `Products: ${products.length} (published ${count((p) => p.status === 'PUBLISHED')}, drafts at 0 OMR ${count((p) => p.status === 'DRAFT')})`,
);
console.log(
  `In stock: ${count((p) => p.stock > 0)}, out of stock: ${count((p) => p.stock === 0 && !p.stockOnRequest)}, services: ${count((p) => p.stockOnRequest)}`,
);
console.log(
  `With photo: ${count((p) => p.imageKey)}; brands: ${brandList.length}; left out (used): ${skipped.length}`,
);
console.log(`Wrote ${migration} and data/inventory.json`);
