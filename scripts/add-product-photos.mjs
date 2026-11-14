// Adds product photos from the web and links them to products.
//
//   npm run photos:add -- <photos.json> drizzle/<NNNN_name>.sql
//
// photos.json: [{ "slug": "...", "imageUrl": "https://...", "sourcePage": "https://..." }]
// Each image is downloaded, checked to be a real image, saved as
// public/products/<slug>.webp (at most 1200px) and recorded in
// scripts/product-image-manifest.json with where it came from. The migration
// points those products at their photo. Then run npm run brand:assets (sizes
// and share images) and npm run media:record (rights list).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [list, migration] = process.argv.slice(2);
if (!list || !migration?.endsWith('.sql')) {
  console.error(
    'Usage: npm run photos:add -- <photos.json> drizzle/<NNNN_name>.sql',
  );
  process.exit(1);
}

const catalog = new Set(
  JSON.parse(readFileSync('data/inventory.json', 'utf8')).products.map(
    (p) => p.slug,
  ),
);
const manifestFile = 'scripts/product-image-manifest.json';
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const photos = JSON.parse(readFileSync(list, 'utf8'));

// Product cards are square: crop the plain margin around the product, then
// centre it on a square canvas of the same background (transparent stays
// transparent), at most 1200px. Artwork that fills its frame (a game cover)
// keeps its edges: it is only padded out to a square, with no extra margin.
async function square(input) {
  const open = () => sharp(input, { limitInputPixels: 40_000_000 }).rotate();
  const full = await open().toBuffer({ resolveWithObject: true });
  const trimmed = await open()
    .trim({ threshold: 12 })
    .toBuffer({ resolveWithObject: true })
    // An image that is all one colour has nothing to trim.
    .catch(() => full);
  const fillsFrame =
    trimmed.info.width * trimmed.info.height >
    0.96 * full.info.width * full.info.height;
  const { data, info } = fillsFrame ? full : trimmed;
  const side = Math.round(
    Math.max(info.width, info.height) * (fillsFrame ? 1 : 1.08),
  );
  const corner = await sharp(data)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .raw()
    .toBuffer();
  const background =
    info.channels === 4 && corner[3] < 250
      ? { r: 0, g: 0, b: 0, alpha: 0 }
      : { r: corner[0], g: corner[1], b: corner[2], alpha: 1 };
  const padX = side - info.width;
  const padY = side - info.height;
  return sharp(data)
    .extend({
      left: Math.floor(padX / 2),
      right: Math.ceil(padX / 2),
      top: Math.floor(padY / 2),
      bottom: Math.ceil(padY / 2),
      background,
    })
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true });
}

const added = [];
for (const { slug, imageUrl, sourcePage } of photos) {
  try {
    if (!catalog.has(slug)) throw new Error('no product with this slug');
    for (const url of [imageUrl, sourcePage])
      if (new URL(url).protocol !== 'https:')
        throw new Error(`not https: ${url}`);
    if (
      existsSync(`public/products/${slug}.webp`) &&
      manifest.some((e) => e.slug === slug && e.imageUrl === imageUrl)
    ) {
      console.log(`kept  ${slug} (already saved)`);
      continue;
    }
    const get = () =>
      fetch(imageUrl, {
        headers: {
          'user-agent': 'Mozilla/5.0 (BLACKSHARK catalog photo import)',
        },
        signal: AbortSignal.timeout(20_000),
      });
    // One retry: image hosts often drop a request when several come at once.
    const response = await get().catch(() =>
      new Promise((resolve) => setTimeout(resolve, 2000)).then(get),
    );
    if (!response.ok) throw new Error(`download failed (${response.status})`);
    const input = Buffer.from(await response.arrayBuffer());
    if (input.length > 15 * 1024 * 1024) throw new Error('image over 15 MB');
    // sharp only accepts real image data; anything else throws here.
    const image = sharp(input, { limitInputPixels: 40_000_000 });
    const { width = 0, height = 0 } = await image.metadata();
    if (width < 300 || height < 300)
      throw new Error(`too small (${width}x${height})`);
    await square(input).then((photo) =>
      photo.webp({ quality: 82 }).toFile(`public/products/${slug}.webp`),
    );
    const entry = { slug, sourcePage, imageUrl };
    const at = manifest.findIndex((e) => e.slug === slug);
    if (at >= 0) manifest[at] = entry;
    else manifest.push(entry);
    added.push(slug);
    console.log(`ok    ${slug} (${width}x${height})`);
  } catch (error) {
    console.log(
      `skip  ${slug}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

manifest.sort((a, b) => a.slug.localeCompare(b.slug));
writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
// Link every listed product that has a photo, including ones saved by an
// earlier run whose download failed this time.
const linked = photos
  .map((photo) => photo.slug)
  .filter((slug, index, all) => all.indexOf(slug) === index)
  .filter(
    (slug) => catalog.has(slug) && existsSync(`public/products/${slug}.webp`),
  );
if (linked.length) {
  const q = (value) => `'${value.replaceAll("'", "''")}'`;
  writeFileSync(
    migration,
    `-- Product photos added by scripts/add-product-photos.mjs.\n${linked
      .map(
        (slug) =>
          `UPDATE products SET image_key = ${q(`/products/${slug}.webp`)}, updated_at = unixepoch() WHERE slug = ${q(slug)};`,
      )
      .join('\n--> statement-breakpoint\n')}\n`,
  );
}
console.log(
  `\n${added.length} of ${photos.length} photos downloaded; ${linked.length} linked${linked.length ? ` in ${migration}` : ''}.`,
);
