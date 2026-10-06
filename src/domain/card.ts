/**
 * Deterministic social card layout engine → SVG string.
 * Rendered to PNG by @resvg/resvg-js (CLI/tests) or react-native-svg + view-shot (app).
 * Content always comes from the public projection. If required text does not fit, the
 * layout reports `overflow` instead of silently dropping source/uncertainty labels.
 */
import type { PublicProjection } from './projection';
import { DEMO_BANNER, shortUrl } from './projection';

export type CardPreset = 'portrait' | 'square' | 'story' | 'wide';
export const PRESETS: Record<CardPreset, { w: number; h: number; label: string; hint: string }> = {
  portrait: { w: 1080, h: 1350, label: 'Portrait', hint: 'Feed posts and general sharing' },
  square: { w: 1080, h: 1080, label: 'Square', hint: 'Most feeds and messaging' },
  story: { w: 1080, h: 1920, label: 'Story', hint: 'Stories and vertical photo posts' },
  wide: { w: 1600, h: 900, label: 'Wide', hint: 'Landscape social, news and community sites' },
};

const C = {
  canvas: '#F6F4EE',
  surface: '#FFFFFF',
  text: '#172624',
  text2: '#536560',
  border: '#DCE3DC',
  primary: '#14675F',
  ochre: '#8C5A12',
  ochreBg: '#FFF1D3',
};

export const FONT_STACK = "'Inter', 'Helvetica Neue', 'Segoe UI', Roboto, 'DejaVu Sans', Arial, sans-serif";

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Conservative width estimate (DejaVu/Roboto-ish average ≈ 0.56em; bold ≈ 0.6em). */
export function wrap(text: string, maxWidth: number, fontSize: number, bold = false): string[] {
  const avg = fontSize * (bold ? 0.6 : 0.56);
  const maxChars = Math.max(4, Math.floor(maxWidth / avg));
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else {
      lines.push(cur);
      cur = w;
    }
    while (cur.length > maxChars) {
      lines.push(cur.slice(0, maxChars - 1) + '-');
      cur = cur.slice(maxChars - 1);
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export interface CardInput {
  projection: PublicProjection;
  preset: CardPreset;
  /** data: URI of an APPROVED redacted derivative, or null to use the schematic. */
  photoDataUri: string | null;
  photoAspect?: number; // w/h
  schematicSvg?: string; // inner SVG (viewBox 0 0 200 200)
}

export interface CardResult {
  svg: string;
  width: number;
  height: number;
  overflow: string[];
}

function textBlock(lines: string[], x: number, y: number, size: number, lh: number, fill: string, weight = 400): string {
  return lines
    .map((l, i) => `<text x="${x}" y="${y + i * lh}" font-family="${esc(FONT_STACK)}" font-size="${size}" font-weight="${weight}" fill="${fill}">${esc(l)}</text>`)
    .join('');
}

export const WORDMARK_PATH =
  // Original Sightline mark: a lens/viewpoint ring with an open notch and a centre pupil.
  'M50 8a42 42 0 1 0 41.2 50h-12.4A30 30 0 1 1 50 20V8z M50 36a14 14 0 1 0 0 28a14 14 0 0 0 0-28z';

export function renderCard(input: CardInput): CardResult {
  const { w, h } = PRESETS[input.preset];
  const p = input.projection;
  const inset = Math.round(Math.min(w, h) * 0.06);
  const wide = input.preset === 'wide';
  const story = input.preset === 'story';
  const overflow: string[] = [];
  const parts: string[] = [];
  const s = wide ? 1 : w / 1080; // scale for type (wide uses 1080-equivalent sizing)
  const ws = wide ? 0.95 : 1;
  parts.push(`<rect width="${w}" height="${h}" fill="${C.canvas}"/>`);

  // Story: keep important information within the middle ~70%.
  const top = story ? Math.round(h * 0.15) : inset;
  const bottom = story ? Math.round(h * 0.85) : h - inset;
  const left = inset;
  const right = w - inset;

  // Wordmark
  const markSize = Math.round(44 * s * ws);
  parts.push(`<g transform="translate(${left},${top}) scale(${markSize / 100})"><path d="${WORDMARK_PATH}" fill="${C.primary}" fill-rule="evenodd"/></g>`);
  parts.push(textBlock(['Sightline'], left + markSize + 14 * s, top + markSize * 0.72, Math.round(30 * s * ws), 0, C.text, 600));

  let y = top + markSize + 28 * s;
  if (p.demonstration) {
    const bh = Math.round(52 * s);
    parts.push(`<rect x="${left}" y="${y}" width="${right - left}" height="${bh}" rx="${12 * s}" fill="${C.ochreBg}" stroke="${C.ochre}" stroke-width="${2 * s}"/>`);
    parts.push(textBlock([DEMO_BANNER], left + 20 * s, y + bh * 0.66, Math.round(24 * s * ws), 0, C.ochre, 700));
    y += bh + 20 * s;
  }

  // Layout columns: wide → photo left, text right; others → photo top, text below.
  const colTextX = wide ? Math.round(w * 0.52) : left;
  const colTextW = wide ? right - colTextX : right - left;

  // Headline (max 2 lines)
  // Shrink-to-fit (never truncate): try sizes down to 70%; if still >2 lines, show all lines and warn.
  const hsMax = Math.round((wide ? 46 : input.preset === 'square' ? 50 : 56) * s);
  let hs = hsMax;
  let hl = wrap(p.headline, colTextW, hs, true);
  while (hl.length > 2 && hs > hsMax * 0.7) {
    hs = Math.round(hs * 0.94);
    hl = wrap(p.headline, colTextW, hs, true);
  }
  if (hl.length > 2) overflow.push('Headline needs more than two lines — consider a shorter location label.');
  const headlineY = y + hs;
  parts.push(textBlock(hl, colTextX, headlineY, hs, hs * 1.2, C.text, 650));
  const afterHeadline = headlineY + hs * 1.2 * (hl.length - 1) + hs * 0.4;

  // Reserve the footer zone (fixed): provenance + attribution + footer.
  const fs = Math.round(24 * s * ws);
  const prov: string[] = [];
  const src = p.sources[0];
  if (src) prov.push(`Source: ${src.publisher}${src.url ? ' · ' + shortUrl(src.url) : ''}`);
  else prov.push('Source: personal observation (no public source attached)');
  for (const a of p.attribution) prov.push(a);
  const provLines = prov.flatMap((t) => wrap(t, wide ? right - left : colTextW, fs));
  const footerLines = [p.footer];
  const footerH = (provLines.length + footerLines.length) * fs * 1.4 + 24 * s;
  const footerTop = bottom - footerH;

  // Facts block
  const facts: [string, string][] = [
    ['Type', p.categoryLabel],
    ['Source status', p.sourceStatus],
    ['Date', [p.observedDateText ? `Observed ${p.observedDateText}` : null, p.sourceRetrievedText ? `Source retrieved ${p.sourceRetrievedText}` : null].filter(Boolean).join(' · ') || 'Date not disclosed'],
  ];
  if (p.identification.familyLabel) facts.splice(1, 0, ['Identification', p.identification.familyLabel]);
  if (p.observerDistanceText) facts.push(['Distance', p.observerDistanceText]);
  const ls = Math.round((wide ? 18 : 22) * s * ws);
  const vs = Math.round((wide ? 25 : input.preset === 'square' ? 27 : 30) * s * ws);
  const factLines = facts.map(([k, v]) => ({ k, v: wrap(v, colTextW, vs, false) }));
  const factsH = factLines.reduce((a, f) => a + ls * 1.3 + f.v.length * vs * 1.25 + 14 * s, 0);

  // Image area
  if (wide) {
    const imgX = left;
    const imgY = y;
    const imgW = Math.round(w * 0.52) - left - inset * 0.6;
    const imgH = footerTop - imgY - 20 * s;
    parts.push(imageOrSchematic(input, imgX, imgY, imgW, imgH));
    let fy = afterHeadline + 24 * s;
    if (fy + factsH > footerTop) overflow.push('Facts do not fit in the wide layout.');
    fy = renderFacts(parts, factLines, colTextX, fy, ls, vs, s);
  } else {
    let fy = afterHeadline + 20 * s;
    const imgTop = fy;
    const imgH = footerTop - factsH - imgTop - 28 * s;
    if (imgH < h * 0.18) overflow.push('Not enough room for the image; choose a taller format or shorten text.');
    parts.push(imageOrSchematic(input, left, imgTop, right - left, Math.max(imgH, 40)));
    fy = imgTop + Math.max(imgH, 40) + 30 * s;
    renderFacts(parts, factLines, left, fy, ls, vs, s);
  }

  // Footer
  parts.push(`<line x1="${left}" y1="${footerTop}" x2="${right}" y2="${footerTop}" stroke="${C.border}" stroke-width="${2 * s}"/>`);
  let ly = footerTop + fs * 1.5;
  parts.push(textBlock(provLines, left, ly, fs, fs * 1.4, C.text2, 400));
  ly += provLines.length * fs * 1.4;
  parts.push(textBlock(footerLines, left, ly, fs, fs * 1.4, C.text, 600));

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(p.headline + ' ' + p.footerAccessible)}">${parts.join('')}</svg>`;
  return { svg, width: w, height: h, overflow };
}

function renderFacts(parts: string[], facts: { k: string; v: string[] }[], x: number, y: number, ls: number, vs: number, s: number): number {
  for (const f of facts) {
    parts.push(textBlock([f.k.toUpperCase()], x, y + ls, ls, 0, C.text2, 600));
    y += ls * 1.3;
    parts.push(textBlock(f.v, x, y + vs, vs, vs * 1.25, C.text, 500));
    y += f.v.length * vs * 1.25 + 14 * s;
  }
  return y;
}

function imageOrSchematic(input: CardInput, x: number, y: number, w: number, h: number): string {
  const r = 20;
  const clipId = 'clip-img';
  const frame = `<defs><clipPath id="${clipId}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath></defs>`;
  if (input.photoDataUri) {
    // "meet" (contain) — never crop away content of the approved derivative.
    return (
      frame +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#E7ECE6"/>` +
      `<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${clipId})" href="${input.photoDataUri}" xlink:href="${input.photoDataUri}"/>`
    );
  }
  const size = Math.min(w, h) * 0.8;
  const sx = x + (w - size) / 2;
  const sy = y + (h - size) / 2;
  return (
    frame +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C.surface}" stroke="${C.border}" stroke-width="2"/>` +
    `<g transform="translate(${sx},${sy}) scale(${size / 200})">${input.schematicSvg ?? ''}</g>` +
    `<text x="${x + 20}" y="${y + h - 20}" font-family="${esc(FONT_STACK)}" font-size="${Math.max(16, Math.round(w / 40))}" fill="${C.text2}">Illustrative schematic — not an evidence photo</text>`
  );
}
