/** Design tokens (spec §5). Contrast verified by tools/content-check/contrast.ts. */
export const LIGHT = {
  canvas: '#F6F4EE',
  surface: '#FFFFFF',
  raised: '#FFFEFA',
  text: '#172624',
  text2: '#536560',
  border: '#DCE3DC',
  borderStrong: '#7D8F88',
  primary: '#14675F',
  onPrimary: '#FFFFFF',
  primarySoft: '#E3F0EC',
  caution: '#8C5A12',
  cautionBg: '#FFF1D3',
  error: '#B33636',
  errorBg: '#FCECEC',
  mapPinAlpr: '#14675F',
  mapPinVideo: '#3B5B92',
  mapPinEnforcement: '#8C5A12',
  mapPinAcoustic: '#6B4E8C',
  mapPinUnknown: '#536560',
  scrim: 'rgba(23,38,36,0.45)',
};
export type Palette = typeof LIGHT;
export const DARK: Palette = {
  canvas: '#101A18',
  surface: '#192623',
  raised: '#22332E',
  text: '#EEF4EF',
  text2: '#B3C2B9',
  border: '#35483F',
  borderStrong: '#6F857B',
  primary: '#8FD8C1',
  onPrimary: '#10231C',
  primarySoft: '#1F3A33',
  caution: '#E4BD73',
  cautionBg: '#33291A',
  error: '#FFA5A0',
  errorBg: '#3A2222',
  mapPinAlpr: '#8FD8C1',
  mapPinVideo: '#A9C2F0',
  mapPinEnforcement: '#E4BD73',
  mapPinAcoustic: '#CDB4EE',
  mapPinUnknown: '#B3C2B9',
  scrim: 'rgba(0,0,0,0.55)',
};
export const TYPE = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '700' as const },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
};
export const SPACE = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32, xxxl: 48 };
export const RADIUS = { card: 20, control: 12, chip: 999 };
export const SIZE = { button: 52, minTarget: 48, gutter: 20, gutterNarrow: 16 };
export const MOTION = { fast: 160, normal: 220 };
