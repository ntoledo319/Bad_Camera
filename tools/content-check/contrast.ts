/** WCAG contrast verification for the design tokens (spec §5). */
import { LIGHT, DARK } from '../../src/design/tokens';
function lum(hex: string) {
  const c = hex.replace('#', '').match(/../g)!.map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function ratio(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const pairs: [string, keyof typeof LIGHT, keyof typeof LIGHT, number][] = [
  ['text on canvas', 'text', 'canvas', 4.5], ['text on surface', 'text', 'surface', 4.5], ['text2 on canvas', 'text2', 'canvas', 4.5], ['text2 on surface', 'text2', 'surface', 4.5],
  ['primary on canvas', 'primary', 'canvas', 4.5], ['onPrimary on primary', 'onPrimary', 'primary', 4.5], ['caution on cautionBg', 'caution', 'cautionBg', 4.5], ['error on errorBg', 'error', 'errorBg', 4.5],
  ['error on surface', 'error', 'surface', 4.5], ['border vs canvas (non-text, decorative)', 'borderStrong', 'canvas', 3],
];
let fail = 0;
for (const [name, T] of [['light', LIGHT], ['dark', DARK]] as const) for (const [label, f, b, min] of pairs) {
  const r = ratio(T[f], T[b]);
  const ok = r >= min;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name.padEnd(5)} ${label.padEnd(40)} ${r.toFixed(2)}:1 (min ${min})`);
}
export const contrastFailures = fail;
if (process.argv[1]?.endsWith('contrast.ts')) process.exit(fail ? 1 : 0);
