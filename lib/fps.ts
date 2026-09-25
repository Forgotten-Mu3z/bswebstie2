// Rough FPS estimates for popular games from a graphics card and processor.
//
// Each graphics card has a relative performance score (RTX 4060 = 100) and
// each processor a speed tier. A game's typical result for the reference card
// at high settings is scaled by the card's score and capped by what the
// processor can feed. The numbers are approximations of typical public
// benchmark results, shown as ranges and always labelled as estimates.

type Model = { pattern: RegExp; name: string; score: number };

// Most specific first: "5070 Ti" must match before "5070".
const GPUS: Model[] = [
  { pattern: /rtx\s*5090/i, name: 'RTX 5090', score: 450 },
  { pattern: /rtx\s*5080/i, name: 'RTX 5080', score: 300 },
  { pattern: /rtx\s*5070\s*ti\b/i, name: 'RTX 5070 Ti', score: 250 },
  { pattern: /rtx\s*5070/i, name: 'RTX 5070', score: 200 },
  { pattern: /rtx\s*5060\s*ti\b/i, name: 'RTX 5060 Ti', score: 140 },
  { pattern: /rtx\s*5060/i, name: 'RTX 5060', score: 120 },
  { pattern: /rtx\s*5050/i, name: 'RTX 5050', score: 95 },
  { pattern: /rtx\s*4090/i, name: 'RTX 4090', score: 360 },
  { pattern: /rtx\s*4080/i, name: 'RTX 4080', score: 270 },
  { pattern: /rtx\s*4070\s*ti\b/i, name: 'RTX 4070 Ti', score: 210 },
  { pattern: /rtx\s*4070\s*super/i, name: 'RTX 4070 Super', score: 195 },
  { pattern: /rtx\s*4070/i, name: 'RTX 4070', score: 170 },
  { pattern: /rtx\s*4060\s*ti\b/i, name: 'RTX 4060 Ti', score: 120 },
  { pattern: /rtx\s*4060/i, name: 'RTX 4060', score: 100 },
  { pattern: /rtx\s*3090/i, name: 'RTX 3090', score: 200 },
  { pattern: /rtx\s*3080\s*ti\b/i, name: 'RTX 3080 Ti', score: 190 },
  { pattern: /rtx\s*3080/i, name: 'RTX 3080', score: 175 },
  { pattern: /rtx\s*3070\s*ti\b/i, name: 'RTX 3070 Ti', score: 145 },
  { pattern: /rtx\s*3070/i, name: 'RTX 3070', score: 135 },
  { pattern: /rtx\s*3060\s*ti\b/i, name: 'RTX 3060 Ti', score: 115 },
  { pattern: /rtx\s*3060/i, name: 'RTX 3060', score: 85 },
  { pattern: /rtx\s*3050/i, name: 'RTX 3050', score: 62 },
  { pattern: /rx\s*9070\s*xt\b/i, name: 'RX 9070 XT', score: 255 },
  { pattern: /rx\s*9070/i, name: 'RX 9070', score: 225 },
  { pattern: /rx\s*9060\s*xt\b/i, name: 'RX 9060 XT', score: 125 },
  { pattern: /rx\s*7900\s*xtx\b/i, name: 'RX 7900 XTX', score: 290 },
  { pattern: /rx\s*7900\s*xt\b/i, name: 'RX 7900 XT', score: 250 },
  { pattern: /rx\s*7800\s*xt\b/i, name: 'RX 7800 XT', score: 190 },
  { pattern: /rx\s*7700\s*xt\b/i, name: 'RX 7700 XT', score: 165 },
  { pattern: /rx\s*7600/i, name: 'RX 7600', score: 105 },
  { pattern: /rx\s*6800\s*xt\b/i, name: 'RX 6800 XT', score: 185 },
  { pattern: /rx\s*67[05]0\s*xt\b/i, name: 'RX 6700 XT', score: 130 },
  { pattern: /rx\s*66[05]0\s*xt\b/i, name: 'RX 6600 XT', score: 105 },
  { pattern: /rx\s*6600/i, name: 'RX 6600', score: 90 },
  { pattern: /gtx\s*1660\s*(super|ti)\b/i, name: 'GTX 1660 Super', score: 62 },
  { pattern: /gtx\s*1660/i, name: 'GTX 1660', score: 55 },
  { pattern: /gtx\s*1650/i, name: 'GTX 1650', score: 45 },
  { pattern: /rx\s*5[78]0\b/i, name: 'RX 580', score: 45 },
];

// Processor speed tier: 1 = the fastest gaming chips.
const CPUS: Model[] = [
  { pattern: /(7800|9800|9850|7950|9950)\s*x3d/i, name: 'Ryzen X3D', score: 1 },
  { pattern: /5[78]00\s*x3d/i, name: 'Ryzen 5000 X3D', score: 0.78 },
  {
    pattern:
      /(9700x|9900x|9950x|7700x|7900x|7950x|ultra\s*[79]\s*2\d{2}|i[79]-1[34]\d{3})/i,
    name: 'high-end',
    score: 0.9,
  },
  {
    pattern:
      /(9600x|7600x|7600\b|7500f|ultra\s*5\s*2\d{2}|i5-1[34]\d{3}|i7-12\d{3})/i,
    name: 'current mid-range',
    score: 0.8,
  },
  { pattern: /i5-12\d{3}/i, name: 'Core i5 12th gen', score: 0.7 },
  {
    pattern: /(5600|5700x|5800x|5900x|5950x|i[579]-11\d{3}|i[79]-10\d{3})/i,
    name: 'previous generation',
    score: 0.62,
  },
  {
    pattern: /(i5-10\d{3}|3600|3700x|3300x|i3-1[0-3]\d{3})/i,
    name: 'older',
    score: 0.5,
  },
  {
    pattern: /(i[57]-[6-9]\d{3}|ryzen\s*5\s*[12]\d{3})/i,
    name: 'much older',
    score: 0.38,
  },
];

/** Tier used when no processor is known: a current mid-range chip. */
const TYPICAL_CPU = 0.8;

export const FPS_GAMES = [
  // fps: reference card (score 100) at 1080p high; cap: fastest CPU limit.
  { name: 'Fortnite', fps: 125, cap: 360, qhd: 0.72 },
  { name: 'Call of Duty: Warzone', fps: 115, cap: 250, qhd: 0.75 },
  { name: 'Call of Duty: Black Ops 7', fps: 110, cap: 280, qhd: 0.74 },
] as const;

const find = (list: Model[], text: string) =>
  list.find((model) => model.pattern.test(text)) ?? null;

export const findGpu = (text: string) => find(GPUS, text);
export const findCpu = (text: string) => find(CPUS, text);

const round5 = (value: number) => Math.max(5, Math.round(value / 5) * 5);

export type FpsRow = {
  game: string;
  fhd: [number, number];
  qhd: [number, number];
  limitedBy: 'graphics card' | 'processor';
};

/** Estimated FPS ranges, or null when the graphics card is not recognised. */
export function estimateFps(gpuText: string, cpuText = '') {
  const gpu = findGpu(gpuText);
  if (!gpu) return null;
  const cpu = cpuText ? findCpu(cpuText) : null;
  const tier = cpu?.score ?? TYPICAL_CPU;
  const rows: FpsRow[] = FPS_GAMES.map((game) => {
    const limit = game.cap * tier;
    const at = (factor: number) => {
      const graphics = game.fps * (gpu.score / 100) * factor;
      return { value: Math.min(graphics, limit), cpuBound: limit < graphics };
    };
    const fhd = at(1);
    const qhd = at(game.qhd);
    return {
      game: game.name,
      fhd: [round5(fhd.value * 0.85), round5(fhd.value * 1.1)],
      qhd: [round5(qhd.value * 0.85), round5(qhd.value * 1.1)],
      limitedBy: fhd.cpuBound ? 'processor' : 'graphics card',
    };
  });
  return { gpu: gpu.name, cpuKnown: Boolean(cpu), rows };
}
