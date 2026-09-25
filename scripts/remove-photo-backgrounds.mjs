// Makes the white studio background of product photos transparent, so they
// sit on the store's dark cards instead of in a white box.
//
//   node scripts/remove-photo-backgrounds.mjs [slug ...]
//
// Only white that touches the photo's edge is removed (a flood fill from the
// border), so white parts inside a product - white cases, fans, box text -
// are kept. Outline pixels are softened so no white fringe shows on dark.
// Photos whose border is already transparent are skipped, so re-running is safe.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

// Read and write whole files ourselves: on Windows, sharp's cache otherwise
// keeps the source file open and it cannot be replaced.
sharp.cache(false);

const DIR = 'public/products';
const FILL_MIN = 226; // darkest channel value still counted as background white
const FILL_TINT = 24; // max channel spread (keeps pale-coloured product parts)
const EDGE_MIN = 170; // outline pixels lighter than this get partly transparent
const EDGE_RADIUS = 2;
// Photos whose studio "floor" has a grey reflection or shadow need a lower
// threshold. Kept per photo so silver product parts elsewhere are not eaten.
const OVERRIDES = {
  'tp-link-archer-t9e-ac1900-pcie-wifi': { fillMin: 185, fillTint: 30 },
};

const only = new Set(process.argv.slice(2));
const files = readdirSync(DIR).filter(
  (file) =>
    file.endsWith('.webp') &&
    (!only.size || only.has(file.replace(/\.webp$/, ''))),
);

for (const file of files) {
  const path = `${DIR}/${file}`;
  const { data, info } = await sharp(readFileSync(path))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const at = (x, y) => (y * w + x) * 4;

  const { fillMin = FILL_MIN, fillTint = FILL_TINT } =
    OVERRIDES[file.replace(/\.webp$/, '')] ?? {};
  const isBackground = (i) => {
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    return data[i + 3] > 0 && min >= fillMin && max - min <= fillTint;
  };

  // Skip photos that already have a transparent border.
  let clearBorder = 0;
  for (let x = 0; x < w; x++) if (data[at(x, 0) + 3] < 128) clearBorder++;
  if (clearBorder > w / 2) {
    console.log(`skip   ${file} (already transparent)`);
    continue;
  }

  // Flood fill from every white border pixel.
  const background = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const seed = (x, y) => {
    const p = y * w + x;
    if (!background[p] && isBackground(p * 4)) {
      background[p] = 1;
      queue[tail++] = p;
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x, 0);
    seed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    seed(0, y);
    seed(w - 1, y);
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }

  let removed = 0;
  for (let p = 0; p < w * h; p++) {
    if (background[p]) {
      data[p * 4 + 3] = 0;
      removed++;
    }
  }

  // Soften outline pixels next to the removed background, and take the white
  // they were blended with back out of their colour.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (background[p]) continue;
      let nearBackground = false;
      for (let dy = -EDGE_RADIUS; dy <= EDGE_RADIUS && !nearBackground; dy++)
        for (let dx = -EDGE_RADIUS; dx <= EDGE_RADIUS; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (
            nx >= 0 &&
            ny >= 0 &&
            nx < w &&
            ny < h &&
            background[ny * w + nx]
          ) {
            nearBackground = true;
            break;
          }
        }
      if (!nearBackground) continue;
      const i = p * 4;
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      if (min <= EDGE_MIN) continue;
      const alpha = Math.max(0.05, (255 - min) / (255 - EDGE_MIN));
      for (let c = 0; c < 3; c++)
        data[i + c] = Math.max(
          0,
          Math.min(255, Math.round((data[i + c] - 255 * (1 - alpha)) / alpha)),
        );
      data[i + 3] = Math.round(alpha * 255);
    }
  }

  writeFileSync(
    path,
    await sharp(data, { raw: { width: w, height: h, channels: 4 } })
      .webp({ quality: 88, alphaQuality: 90, effort: 5 })
      .toBuffer(),
  );
  console.log(
    `done   ${file} (${Math.round((removed / (w * h)) * 100)}% background removed)`,
  );
}
