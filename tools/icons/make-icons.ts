/** Generates app icons from the original Sightline mark (no vendor marks). */
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { WORDMARK_PATH } from '../../src/domain/card';

const TEAL = '#14675F', CANVAS = '#F6F4EE', MINT = '#8FD8C1';
const mark = (fill: string, scale: number, cx = 512) => {
  const s = (1024 * scale) / 100;
  return `<g transform="translate(${cx - 50 * s} ${512 - 50 * s}) scale(${s})"><path d="${WORDMARK_PATH}" fill="${fill}" fill-rule="evenodd"/></g>`;
};
const svg = (body: string, bg?: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''}${body}</svg>`;
const out = (name: string, s: string, w = 1024) => writeFileSync(`assets/${name}`, new Resvg(s, { fitTo: { mode: 'width', value: w } }).render().asPng());

// iOS / generic icon: full-bleed teal, canvas-coloured mark at ~56%.
out('icon.png', svg(mark(CANVAS, 0.56), TEAL));
// Android adaptive: foreground mark within the 66% safe zone; separate background; monochrome.
out('android-icon-foreground.png', svg(mark(CANVAS, 0.42)));
out('android-icon-background.png', svg('', TEAL));
out('android-icon-monochrome.png', svg(mark('#000000', 0.42)));
// Splash icon (shown on canvas background) and favicon.
out('splash-icon.png', svg(mark(TEAL, 0.7)));
out('favicon.png', svg(mark(CANVAS, 0.64), TEAL), 64);
// Dark splash variant uses mint.
out('splash-icon-dark.png', svg(mark(MINT, 0.7)));
console.log('icons written');
