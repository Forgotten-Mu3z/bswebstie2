// Turns data/instagram-products.json (products taken from the store's own
// Instagram posts) into store listings:
//   public/products/<slug>.webp          the post's photo
//   drizzle/0003_instagram_products.sql  the catalog rows (a D1 migration)
//   scripts/product-image-manifest.json  where each photo came from
//
//   npm run instagram:products -- "<path to the blackshark-instagram archive>"
//
// Then run `npm run brand:assets` (smaller photo sizes and share images) and
// apply the migration. Products are listed as "ask for stock"; the price is
// the one in the newest post. Drafts had no price in the post.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import sharp from 'sharp';

const archive = process.argv[2] && resolve(process.argv[2]);
if (!archive || !existsSync(join(archive, 'catalog.json'))) {
  console.error(
    'Pass the archive folder (the one that contains catalog.json).',
  );
  process.exit(1);
}

const { brands, products } = JSON.parse(
  readFileSync('data/instagram-products.json', 'utf8'),
);
const posts = new Map(
  JSON.parse(readFileSync(join(archive, 'catalog.json'), 'utf8')).map(
    (post) => [post.shortcode, post],
  ),
);

const CATEGORY = {
  games: 'cat-games',
  consoles: 'cat-console',
  monitors: 'cat-monitor',
  'gaming-gear': 'cat-gear',
  'gaming-pcs': 'cat-builds',
  'pc-components': 'cat-pc',
};

// Instagram shortcodes encode the posting time (the top bits of the media ID).
const ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function postedAt(code) {
  let id = 0n;
  for (const char of code.slice(0, 11))
    id = id * 64n + BigInt(ALPHABET.indexOf(char));
  return Math.floor(Number((id >> 23n) + 1314220021721n) / 1000);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const q = (value) =>
  value === null || value === undefined
    ? 'NULL'
    : `'${String(value).replaceAll("'", "''")}'`;

// --- checks -------------------------------------------------------------------
const seen = new Set();
for (const product of products) {
  const where = `Product ${product.slug}:`;
  if (
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(product.slug) ||
    product.slug.length > 120
  )
    fail(`${where} bad slug`);
  if (seen.has(product.slug)) fail(`${where} slug used twice`);
  seen.add(product.slug);
  if (!CATEGORY[product.category])
    fail(`${where} unknown category ${product.category}`);
  if (product.brand && !brands[product.brand])
    fail(`${where} unknown brand ${product.brand}`);
  if (!posts.has(product.post))
    fail(`${where} post ${product.post} is not in the archive`);
  if (product.photo && !posts.has(product.photo))
    fail(`${where} photo post ${product.photo} is not in the archive`);
  if (!(product.price > 0) && product.status !== 'DRAFT')
    fail(`${where} a live product needs a price`);
}

// --- photos -------------------------------------------------------------------
sharp.cache(false);
const manifest = JSON.parse(
  readFileSync('scripts/product-image-manifest.json', 'utf8'),
);
const bySlug = new Map(manifest.map((entry) => [entry.slug, entry]));
for (const product of products) {
  const post = posts.get(product.photo ?? product.post);
  const file = post.slide_files?.[product.slide ?? 0] ?? post.cover_file;
  const source = resolve(archive, file);
  if (relative(archive, source).startsWith('..') || !existsSync(source))
    fail(`Product ${product.slug}: photo ${file} is missing`);
  writeFileSync(
    join('public', 'products', `${product.slug}.webp`),
    await sharp(readFileSync(source))
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer(),
  );
  bySlug.set(product.slug, {
    slug: product.slug,
    sourcePage: post.source_url,
    rights: "The store's own Instagram post (@blackshark__gaming).",
  });
}
writeFileSync(
  'scripts/product-image-manifest.json',
  `${JSON.stringify([...bySlug.values()], null, 2)}\n`,
);

// --- migration ------------------------------------------------------------------
const columns = [
  'id',
  'slug',
  'sku',
  'name',
  'name_ar',
  'summary',
  'category_id',
  'brand_id',
  'part_type',
  'attributes',
  'price_baisa',
  'sale_price_baisa',
  'stock',
  'stock_on_request',
  'low_stock_threshold',
  'status',
  'featured',
  'image_key',
  'source_url',
  'created_at',
  'updated_at',
];
const rows = products.map((product, index) => {
  const post = posts.get(product.post);
  const time = postedAt(product.post);
  const sameSku = products.filter(
    (other) => other.post === product.post && !other.sku,
  );
  const sku =
    product.sku ??
    (sameSku.length > 1
      ? `IG-${product.post}-${sameSku.indexOf(product) + 1}`
      : `IG-${product.post}`);
  const id = `ig-${createHash('sha256').update(product.slug).digest('hex').slice(0, 16)}`;
  const values = [
    q(id),
    q(product.slug),
    q(sku),
    q(product.name),
    q(''),
    q(product.summary),
    q(CATEGORY[product.category]),
    product.brand ? q(`brand-${product.brand}`) : 'NULL',
    q(product.partType ?? null),
    q(JSON.stringify(product.attributes ?? {})),
    Math.round(product.price * 1000),
    'NULL',
    0,
    1,
    0,
    q(product.status ?? 'PUBLISHED'),
    0,
    q(`/products/${product.slug}.webp`),
    q(post.source_url),
    time,
    time,
  ];
  if (values.length !== columns.length)
    fail(`Row ${index} has the wrong number of values`);
  return `(${values.join(', ')})`;
});

const brandRows = Object.entries(brands).map(
  ([slug, name]) => `(${q(`brand-${slug}`)}, ${q(slug)}, ${q(name)})`,
);
const sql = `-- Products listed from the store's own Instagram posts (last 12 months,
-- posts only, no used items). Generated by scripts/import-instagram-products.mjs
-- from data/instagram-products.json; edit that file and re-run instead.

INSERT OR IGNORE INTO categories (id, slug, name, description, sort_order, enabled) VALUES
('cat-games', 'games', 'Games', 'PlayStation, Xbox and Nintendo Switch games.', 6, 1);
--> statement-breakpoint
UPDATE categories SET sort_order = 7 WHERE id = 'cat-digital' AND sort_order = 6;
--> statement-breakpoint
UPDATE categories SET description = 'Chairs, desks, keyboards, headsets and accessories for your setup.'
WHERE id = 'cat-gear' AND description = 'Headsets and accessories for your setup.';
--> statement-breakpoint
INSERT OR IGNORE INTO brands (id, slug, name) VALUES
${brandRows.join(',\n')};
--> statement-breakpoint
INSERT OR IGNORE INTO products (${columns.join(', ')}) VALUES
${rows.join(',\n')};
`;
writeFileSync(join('drizzle', '0003_instagram_products.sql'), sql);

const live = products.filter((product) => product.status !== 'DRAFT');
console.log(`${products.length} products (${live.length} live, ${products.length - live.length} drafts), ${products.length} photos.
Next: npm run brand:assets, then apply the migration.`);
