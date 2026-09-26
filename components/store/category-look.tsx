import {
  Cpu,
  CreditCard,
  Disc3,
  Gamepad2,
  Headphones,
  Monitor,
  Package,
  PcCase,
  type LucideIcon,
} from 'lucide-react';

// An icon and a colour for each department, used where the phone layout
// shows categories as tiles and chips.
const LOOKS: Record<string, { icon: LucideIcon; hue: string }> = {
  'pc-components': { icon: Cpu, hue: '#3de0ff' },
  'gaming-pcs': { icon: PcCase, hue: '#9b7bff' },
  'gaming-gear': { icon: Headphones, hue: '#5fe3a1' },
  monitors: { icon: Monitor, hue: '#5b9dff' },
  consoles: { icon: Gamepad2, hue: '#ff7ab6' },
  games: { icon: Disc3, hue: '#f3bd55' },
  'digital-cards': { icon: CreditCard, hue: '#ff9f5a' },
};

export function categoryLook(slug: string) {
  return LOOKS[slug] ?? { icon: Package, hue: '#9aa4b2' };
}

/** The category's colour as a CSS variable (--hue) for arbitrary values. */
export const hueStyle = (slug: string) =>
  ({ '--hue': categoryLook(slug).hue }) as React.CSSProperties;
