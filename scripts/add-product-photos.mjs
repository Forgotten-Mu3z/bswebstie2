// Adds product photos from the web and links them to products.
//
//   npm run photos:add -- <photos.json> drizzle/<NNNN_name>.sql
//   npm run photos:add -- --redo [slug ...]   (rebuild saved photos from their source)
//
// photos.json: [{ "slug": "...", "imageUrl": "https://...", "sourcePage": "https://..." }]
// Each image is downloaded, checked to be a real image, cut out from its
// background, saved as public/products/<slug>.webp (square, at most 1200px,
// transparent around the product) and recorded in
// scripts/product-image-manifest.json with where it came from. The migration
// points those products at their photo. Then run npm run brand:assets (sizes
// and share images) and npm run media:record (rights list).
//
// Optional per photo: "representative": true (photo shows this kind of
// product), "cropBottom": 0.1 (cut a promo strip off the bottom),
// "keepBackground": true (a scene that should not be cut out).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const args = process.argv.slice(2);
const redo = args[0] === '--redo';
const [list, migration] = redo ? [] : args;
if (!redo && (!list || !migration?.endsWith('.sql'))) {
  console.error(
    'Usage: npm run photos:add -- <photos.json> drizzle/<NNNN_name>.sql\n' +
      '       npm run photos:add -- --redo',
  );
  process.exit(1);
}

const products = JSON.parse(
  readFileSync('data/inventory.json', 'utf8'),
).products;
const catalog = new Set(products.map((p) => p.slug));
// Game photos are cover art: the whole picture is the product.
const covers = new Set(
  products.filter((p) => p.categoryId === 'cat-games').map((p) => p.slug),
);
const manifestFile = 'scripts/product-image-manifest.json';
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
// --redo rebuilds every saved photo, or only the slugs named after it.
const only = new Set(redo ? args.slice(1) : []);
const photos = redo
  ? manifest
      .filter((entry) => !only.size || only.has(entry.slug))
      .map((entry) => ({ ...entry }))
  : JSON.parse(readFileSync(list, 'utf8'));

const open = (input) =>
  sharp(input, { limitInputPixels: 40_000_000 }).rotate().ensureAlpha();

// Makes the plain backdrop of a product shot transparent. Starting from the
// image edges, every pixel joined to the edge that is close to the backdrop
// colour (or already see-through) is cleared; the outline is then softened so
// it blends into any card. Returns the cropped cut-out, or null when the edges
// are not a plain backdrop (a scene or full artwork), which is left as it is.
async function cutOut(input) {
  const { data, info } = await open(input)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const edge = [];
  for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) edge.push(y * w, y * w + w - 1);
  // Backdrop colour: the most common colour along the edges.
  const buckets = new Map();
  let clear = 0;
  for (const p of edge) {
    const i = p * 4;
    if (data[i + 3] < 128) {
      clear++;
      continue;
    }
    const key =
      ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    b.n++;
    b.r += data[i];
    b.g += data[i + 1];
    b.b += data[i + 2];
    buckets.set(key, b);
  }
  const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
  if (clear + (top?.n ?? 0) < edge.length * 0.6) return null;
  const bg = top ? [top.r / top.n, top.g / top.n, top.b / top.n] : null;
  const diff = (i) =>
    bg
      ? Math.max(
          Math.abs(data[i] - bg[0]),
          Math.abs(data[i + 1] - bg[1]),
          Math.abs(data[i + 2] - bg[2]),
        )
      : 255;
  // How far a pixel may be from the backdrop colour and still count as
  // backdrop: just above the backdrop's own noise along the edges, so a light
  // product on a clean white backdrop keeps its pale edges.
  const noise = edge
    .map((p) => diff(p * 4))
    .filter((d) => d < 40)
    .sort((a, b) => a - b);
  const NEAR = Math.min(
    26,
    Math.max(8, (noise[Math.floor(noise.length * 0.95)] ?? 0) + 6),
  );
  const FAR = NEAR + 44;
  const backdrop = (i) => data[i + 3] < 128 || diff(i) <= NEAR;
  const gone = new Uint8Array(w * h);
  const neighbours = (p) => {
    const x = p % w;
    return [
      x > 0 ? p - 1 : -1,
      x < w - 1 ? p + 1 : -1,
      p - w,
      p + w < w * h ? p + w : -1,
    ];
  };
  const stack = [];
  for (const p of edge)
    if (!gone[p] && backdrop(p * 4)) {
      gone[p] = 1;
      stack.push(p);
    }
  while (stack.length)
    for (const q of neighbours(stack.pop()))
      if (q >= 0 && !gone[q] && backdrop(q * 4)) {
        gone[q] = 1;
        stack.push(q);
      }
  // Gaps the product closes in (inside a headband, a cable loop) are backdrop
  // too: clear a sizeable patch that is almost exactly the backdrop colour when
  // what surrounds it (four pixels deep, past the soft edge) is mostly dark,
  // neutral material. White panels of a product are shaded rather than flat,
  // or sit next to pale or coloured parts, so they stay.
  if (bg) {
    const darkNeutral = (i) =>
      0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2] < 110 &&
      Math.max(data[i], data[i + 1], data[i + 2]) -
        Math.min(data[i], data[i + 1], data[i + 2]) <
        40;
    const seen = new Uint8Array(w * h);
    const minArea = w * h * 0.0015;
    for (let start = 0; start < w * h; start++) {
      if (gone[start] || seen[start] || !backdrop(start * 4)) continue;
      const patch = [start];
      seen[start] = 1;
      for (let k = 0; k < patch.length; k++)
        for (const q of neighbours(patch[k]))
          if (q >= 0 && !gone[q] && !seen[q] && backdrop(q * 4)) {
            seen[q] = 1;
            patch.push(q);
          }
      if (patch.length < minArea) continue;
      let pure = 0;
      for (const p of patch) if (diff(p * 4) <= 3) pure++;
      if (pure < patch.length * 0.85) continue;
      const inPatch = new Set(patch);
      const shell = new Set();
      let front = patch;
      for (let layer = 0; layer < 4; layer++) {
        const next = [];
        for (const p of front)
          for (const q of neighbours(p))
            if (q >= 0 && !gone[q] && !inPatch.has(q) && !shell.has(q)) {
              shell.add(q);
              next.push(q);
            }
        front = next;
      }
      let dark = 0;
      for (const q of shell) if (darkNeutral(q * 4)) dark++;
      if (shell.size && dark > shell.size * 0.5)
        for (const p of patch) gone[p] = 1;
    }
  }
  let left = w;
  let right = -1;
  let topY = h;
  let bottom = -1;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    if (gone[p]) {
      data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
      continue;
    }
    const x = p % w;
    const y = (p - x) / w;
    // Soften the outline: edge pixels still close to the backdrop colour
    // (anti-aliasing, glow) become partly see-through.
    const touches =
      (x > 0 && gone[p - 1]) ||
      (x < w - 1 && gone[p + 1]) ||
      (y > 0 && gone[p - w]) ||
      (y < h - 1 && gone[p + w]);
    if (touches) {
      const d = diff(i);
      if (d < FAR)
        data[i + 3] = Math.min(
          data[i + 3],
          Math.round((255 * (d - NEAR)) / (FAR - NEAR)),
        );
    }
    if (data[i + 3] > 8) {
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < topY) topY = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null;
  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .extract({
      left,
      top: topY,
      width: right - left + 1,
      height: bottom - topY + 1,
    })
    .png()
    .toBuffer();
}

// Product cards are square, so every photo is centred on a transparent square
// canvas, at most 1200px. A cut-out product gets a small margin; a game cover
// (the artwork is the product) or a scene keeps its edges with no margin.
async function square(input, keepAsIs) {
  const full = await open(input).png().toBuffer({ resolveWithObject: true });
  const cut = keepAsIs ? null : await cutOut(full.data);
  const { data, info } = await open(cut ?? full.data)
    .png()
    .toBuffer({ resolveWithObject: true });
  const side = Math.round(Math.max(info.width, info.height) * (cut ? 1.08 : 1));
  const padX = side - info.width;
  const padY = side - info.height;
  return {
    cut: Boolean(cut),
    photo: sharp(data)
      .extend({
        left: Math.floor(padX / 2),
        right: Math.ceil(padX / 2),
        top: Math.floor(padY / 2),
        bottom: Math.ceil(padY / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }),
  };
}

const added = [];
for (const {
  slug,
  imageUrl,
  sourcePage,
  representative,
  cropBottom,
  keepBackground,
} of photos) {
  try {
    if (!catalog.has(slug)) throw new Error('no product with this slug');
    for (const url of [imageUrl, sourcePage])
      if (new URL(url).protocol !== 'https:')
        throw new Error(`not https: ${url}`);
    if (
      !redo &&
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
    let input = Buffer.from(await response.arrayBuffer());
    if (input.length > 15 * 1024 * 1024) throw new Error('image over 15 MB');
    // sharp only accepts real image data; anything else throws here.
    const image = sharp(input, { limitInputPixels: 40_000_000 });
    const { width = 0, height = 0 } = await image.metadata();
    if (width < 300 || height < 300)
      throw new Error(`too small (${width}x${height})`);
    // "cropBottom": 0.1 cuts off the bottom 10%, for store art with a promo
    // strip ("Free DLC available now") along the bottom edge.
    if (cropBottom) {
      if (!(cropBottom > 0 && cropBottom < 0.3))
        throw new Error(`cropBottom must be between 0 and 0.3`);
      input = await sharp(input, { limitInputPixels: 40_000_000 })
        .rotate()
        .extract({
          left: 0,
          top: 0,
          width,
          height: Math.round(height * (1 - cropBottom)),
        })
        .toBuffer();
    }
    const { cut, photo } = await square(
      input,
      keepBackground || covers.has(slug),
    );
    await photo
      .webp({ quality: 82, alphaQuality: 90 })
      .toFile(`public/products/${slug}.webp`);
    const entry = {
      slug,
      sourcePage,
      imageUrl,
      ...(representative ? { representative: true } : {}),
      ...(cropBottom ? { cropBottom } : {}),
      ...(keepBackground ? { keepBackground: true } : {}),
    };
    const at = manifest.findIndex((e) => e.slug === slug);
    if (at >= 0) manifest[at] = entry;
    else manifest.push(entry);
    added.push(slug);
    console.log(
      `ok    ${slug} (${width}x${height}, ${cut ? 'cut out' : 'artwork'})`,
    );
  } catch (error) {
    console.log(
      `skip  ${slug}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

manifest.sort((a, b) => a.slug.localeCompare(b.slug));
writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
// The product page says when a photo shows the kind of product rather than
// the exact item.
writeFileSync(
  'lib/representative-photos.json',
  `${JSON.stringify(
    manifest.filter((e) => e.representative).map((e) => e.slug),
    null,
    2,
  )}\n`,
);
// Link every listed product that has a photo, including ones saved by an
// earlier run whose download failed this time.
const linked = photos
  .map((photo) => photo.slug)
  .filter((slug, index, all) => all.indexOf(slug) === index)
  .filter(
    (slug) => catalog.has(slug) && existsSync(`public/products/${slug}.webp`),
  );
// A redo only replaces the files: the products already point at them.
if (linked.length && !redo) {
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
  redo
    ? `\n${added.length} of ${photos.length} photos rebuilt.`
    : `\n${added.length} of ${photos.length} photos downloaded; ${linked.length} linked${linked.length ? ` in ${migration}` : ''}.`,
);
