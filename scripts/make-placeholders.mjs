// Draws the picture shown for a product that has no photo yet: one per
// category, with that category's icon and colour (as in
// components/store/category-look.tsx), plus a plain one for anything else.
//
//   npm run placeholders
//
// Writes public/placeholders/<category-slug>.svg. Static files, so showing
// them costs the Worker nothing.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Keep in step with components/store/category-look.tsx.
const LOOKS = {
  'pc-components': { icon: 'cpu', hue: '#3de0ff', label: 'PC components' },
  'gaming-pcs': { icon: 'pc-case', hue: '#9b7bff', label: 'Gaming PCs' },
  'gaming-gear': { icon: 'headphones', hue: '#5fe3a1', label: 'Gaming gear' },
  monitors: { icon: 'monitor', hue: '#5b9dff', label: 'Monitors' },
  consoles: { icon: 'gamepad-2', hue: '#ff7ab6', label: 'Consoles' },
  games: { icon: 'disc-3', hue: '#f3bd55', label: 'Games' },
  collectibles: { icon: 'sparkles', hue: '#ff6b6b', label: 'Collectibles' },
  'repairs-services': {
    icon: 'wrench',
    hue: '#c9d1dc',
    label: 'Repairs and services',
  },
  'digital-cards': {
    icon: 'credit-card',
    hue: '#ff9f5a',
    label: 'Digital cards',
  },
  product: { icon: 'package', hue: '#9aa4b2', label: 'Product' },
};

// Lucide's icon shapes, read from the installed lucide-react package.
function iconShapes(name) {
  const source = readFileSync(
    join('node_modules', 'lucide-react', 'dist', 'esm', 'icons', `${name}.mjs`),
    'utf8',
  );
  const node = source.match(/const __iconNode = (\[[\s\S]*?\]);\n/)?.[1];
  if (!node) throw new Error(`No icon data in lucide-react for ${name}`);
  // The array is plain data (tag names and string attributes).
  const shapes = Function(`"use strict"; return (${node});`)();
  return shapes
    .map(([tag, attrs]) => {
      const list = Object.entries(attrs)
        .filter(([key]) => key !== 'key')
        .map(
          ([key, value]) => `${key}="${String(value).replace(/"/g, '&quot;')}"`,
        )
        .join(' ');
      return `<${tag} ${list}/>`;
    })
    .join('');
}

const svg = ({
  icon,
  hue,
  label,
}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#0d1016"/>
      <stop offset="1" stop-color="#151a23"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.46" r="0.42">
      <stop offset="0" stop-color="${hue}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${hue}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity="0.035" stroke-width="1.5"/>
    </pattern>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <rect width="800" height="800" fill="url(#grid)"/>
  <circle cx="400" cy="368" r="330" fill="url(#glow)"/>
  <circle cx="400" cy="368" r="206" fill="none" stroke="${hue}" stroke-opacity="0.18" stroke-width="2"/>
  <g transform="translate(400 368) scale(11.5) translate(-12 -12)" fill="none" stroke="${hue}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${iconShapes(icon)}</g>
  <text x="400" y="690" fill="#e9edf2" fill-opacity="0.42" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" letter-spacing="9" text-anchor="middle">BLACKSHARK</text>
</svg>
`;

mkdirSync(join('public', 'placeholders'), { recursive: true });
for (const [slug, look] of Object.entries(LOOKS))
  writeFileSync(join('public', 'placeholders', `${slug}.svg`), svg(look));
console.log(
  `Wrote ${Object.keys(LOOKS).length} placeholders to public/placeholders/`,
);
