// Generates the favicon set, the web app manifest and the 1200x630 social
// share images from public/blackshark-logo.png and the product photos.
//
//   npm run brand:assets
//
// Run again after changing the logo or adding product photos.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

sharp.cache(false);
const BG = '#07080b';
const LINE = '#1e232c';
const ACCENT = '#3de0ff';
const logo = readFileSync('public/blackshark-logo.png');

// The logo is 150px; larger icons are scaled up from it.
const icon = (size) =>
  sharp(logo)
    .resize(size, size, { kernel: 'lanczos3' })
    .flatten({ background: BG })
    .png();

// --- Favicons ---------------------------------------------------------------
const sizes = {
  'icon-16.png': 16,
  'icon-32.png': 32,
  'icon-192.png': 192,
  'icon-512.png': 512,
  'apple-touch-icon.png': 180,
};
for (const [name, size] of Object.entries(sizes))
  writeFileSync(join('public', name), await icon(size).toBuffer());

// favicon.ico holding 16, 32 and 48px PNGs (supported by every current browser).
const icoImages = await Promise.all(
  [16, 32, 48].map((size) => icon(size).toBuffer()),
);
const header = Buffer.alloc(6 + 16 * icoImages.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoImages.length, 4);
let offset = header.length;
icoImages.forEach((image, index) => {
  const size = [16, 32, 48][index];
  const entry = 6 + index * 16;
  header.writeUInt8(size, entry);
  header.writeUInt8(size, entry + 1);
  header.writeUInt16LE(1, entry + 4); // colour planes
  header.writeUInt16LE(32, entry + 6); // bits per pixel
  header.writeUInt32LE(image.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
writeFileSync('public/favicon.ico', Buffer.concat([header, ...icoImages]));

writeFileSync(
  'public/site.webmanifest',
  `${JSON.stringify(
    {
      name: 'BLACKSHARK: Gaming PCs, parts and gear in Oman',
      short_name: 'BLACKSHARK',
      start_url: '/',
      display: 'standalone',
      background_color: BG,
      theme_color: BG,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  )}\n`,
);

// --- Share images (1200x630) -----------------------------------------------
const W = 1200;
const H = 630;
const grid = Array.from({ length: 30 }, (_, i) => i * 40)
  .map(
    (x) =>
      `<path d="M${x} 0V${H}M0 ${x}H${W}" stroke="${LINE}" stroke-width="1" opacity="0.55"/>`,
  )
  .join('');
const frame = (extra) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="${BG}"/>${grid}
      <rect x="0" y="${H - 8}" width="${W}" height="8" fill="${ACCENT}"/>
      ${extra}
    </svg>`,
  );
const font = "font-family=\"'Segoe UI', 'Helvetica Neue', Arial, sans-serif\"";
const mark = (x, y, size) =>
  sharp(logo)
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toBuffer()
    .then((input) => ({ input, left: x, top: y }));

mkdirSync('public/og/products', { recursive: true });

await sharp(
  frame(`
    <text x="80" y="330" ${font} font-size="92" font-weight="700" fill="#e9edf2" letter-spacing="6">BLACKSHARK</text>
    <text x="84" y="400" ${font} font-size="40" fill="#9aa4b2">Gaming PCs, PC parts and gaming gear in Oman</text>
    <text x="84" y="470" ${font} font-size="30" fill="${ACCENT}">Prices in OMR · Live stock · PC builder</text>`),
)
  .composite([await mark(84, 90, 150)])
  .png()
  .toFile('public/og/default.png');

// Product images: the photo on the right, the brand on the left. No product
// name or price in the image, so it never goes out of date.
let count = 0;
for (const file of readdirSync('public/products').filter((name) =>
  name.endsWith('.webp'),
)) {
  const photo = await sharp(join('public/products', file))
    .resize(520, 520, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  await sharp(
    frame(`
      <rect x="600" y="40" width="560" height="550" rx="14" fill="#0e1015" stroke="${LINE}"/>
      <text x="80" y="330" ${font} font-size="64" font-weight="700" fill="#e9edf2" letter-spacing="4">BLACKSHARK</text>
      <text x="82" y="390" ${font} font-size="32" fill="#9aa4b2">Gaming PCs and parts in Oman</text>
      <text x="82" y="450" ${font} font-size="28" fill="${ACCENT}">Prices in OMR · Live stock</text>`),
  )
    .composite([await mark(82, 110, 130), { input: photo, left: 620, top: 55 }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(join('public/og/products', file.replace(/\.webp$/, '.jpg')));
  count++;
}
console.log(
  `Icons, favicon.ico, site.webmanifest, og/default.png and ${count} product share images written.`,
);
