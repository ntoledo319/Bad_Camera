/**
 * Non-destructive redaction pipeline. Transformations are stored as data; a public
 * derivative is produced by decoding pixels, applying rotate → crop → solid masks, and
 * RE-ENCODING a fresh JPEG with no APP1/EXIF/XMP/IPTC segments and no embedded thumbnail.
 * Masks are burnt into the raster: there are no layers to remove. Originals are never touched.
 */
import * as jpeg from 'jpeg-js';
import type { Transformation } from './schemas';

export interface Rgba {
  width: number;
  height: number;
  data: Uint8Array; // RGBA
}

export const MAX_DERIVATIVE_EDGE = 2048;
export const MAX_DECODE_MP = 48;

export function decodeJpeg(bytes: Uint8Array): Rgba {
  const r = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: MAX_DECODE_MP, maxMemoryUsageInMB: 768 });
  return { width: r.width, height: r.height, data: r.data as Uint8Array };
}

export function encodeJpeg(img: Rgba, quality = 88): Uint8Array {
  // No exifBuffer passed → encoder writes only SOI/APP0(JFIF)/DQT/SOF/DHT/SOS/EOI.
  const out = jpeg.encode({ width: img.width, height: img.height, data: img.data }, quality);
  return new Uint8Array(out.data);
}

export function rotate(img: Rgba, deg: 0 | 90 | 180 | 270): Rgba {
  if (deg === 0) return img;
  const { width: w, height: h, data } = img;
  const nw = deg === 180 ? w : h;
  const nh = deg === 180 ? h : w;
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let nx: number, ny: number;
      if (deg === 90) {
        nx = h - 1 - y;
        ny = x;
      } else if (deg === 180) {
        nx = w - 1 - x;
        ny = h - 1 - y;
      } else {
        nx = y;
        ny = w - 1 - x;
      }
      const si = (y * w + x) * 4;
      const di = (ny * nw + nx) * 4;
      out[di] = data[si];
      out[di + 1] = data[si + 1];
      out[di + 2] = data[si + 2];
      out[di + 3] = 255;
    }
  }
  return { width: nw, height: nh, data: out };
}

/** Coordinates for crop/mask are normalized 0..1 relative to the image AFTER rotation (and crop for masks). */
export function crop(img: Rgba, x: number, y: number, w: number, h: number): Rgba {
  const x0 = Math.max(0, Math.floor(x * img.width));
  const y0 = Math.max(0, Math.floor(y * img.height));
  const x1 = Math.min(img.width, Math.ceil((x + w) * img.width));
  const y1 = Math.min(img.height, Math.ceil((y + h) * img.height));
  const nw = Math.max(1, x1 - x0);
  const nh = Math.max(1, y1 - y0);
  const out = new Uint8Array(nw * nh * 4);
  for (let row = 0; row < nh; row++) {
    const src = ((y0 + row) * img.width + x0) * 4;
    out.set(img.data.subarray(src, src + nw * 4), row * nw * 4);
  }
  return { width: nw, height: nh, data: out };
}

export function applyMask(img: Rgba, shape: 'rect' | 'ellipse', x: number, y: number, w: number, h: number, rgb: [number, number, number] = [23, 38, 36]): void {
  // Masks are padded by 1px to avoid edge leakage from JPEG chroma subsampling.
  const x0 = Math.max(0, Math.floor(x * img.width) - 1);
  const y0 = Math.max(0, Math.floor(y * img.height) - 1);
  const x1 = Math.min(img.width, Math.ceil((x + w) * img.width) + 1);
  const y1 = Math.min(img.height, Math.ceil((y + h) * img.height) + 1);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = (x1 - x0) / 2;
  const ry = (y1 - y0) / 2;
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      if (shape === 'ellipse') {
        const dx = (px + 0.5 - cx) / rx;
        const dy = (py + 0.5 - cy) / ry;
        if (dx * dx + dy * dy > 1) continue;
      }
      const i = (py * img.width + px) * 4;
      img.data[i] = rgb[0];
      img.data[i + 1] = rgb[1];
      img.data[i + 2] = rgb[2];
      img.data[i + 3] = 255;
    }
  }
}

/** Area-average downsample so the derivative never exceeds maxEdge. */
export function downsample(img: Rgba, maxEdge = MAX_DERIVATIVE_EDGE): Rgba {
  const scale = Math.max(img.width, img.height) / maxEdge;
  if (scale <= 1) return img;
  const nw = Math.max(1, Math.round(img.width / scale));
  const nh = Math.max(1, Math.round(img.height / scale));
  const out = new Uint8Array(nw * nh * 4);
  for (let y = 0; y < nh; y++) {
    const sy0 = Math.floor((y * img.height) / nh);
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * img.height) / nh));
    for (let x = 0; x < nw; x++) {
      const sx0 = Math.floor((x * img.width) / nw);
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * img.width) / nw));
      let r = 0,
        g = 0,
        b = 0,
        n = 0;
      for (let sy = sy0; sy < sy1; sy++)
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * img.width + sx) * 4;
          r += img.data[i];
          g += img.data[i + 1];
          b += img.data[i + 2];
          n++;
        }
      const o = (y * nw + x) * 4;
      out[o] = r / n;
      out[o + 1] = g / n;
      out[o + 2] = b / n;
      out[o + 3] = 255;
    }
  }
  return { width: nw, height: nh, data: out };
}

export function applyTransformations(src: Rgba, t: Transformation[]): Rgba {
  let img: Rgba = { width: src.width, height: src.height, data: src.data.slice() };
  let rotSum = 0;
  for (const x of t) if (x.type === 'rotate') rotSum = (rotSum + x.degrees) % 360;
  const rot = rotSum as 0 | 90 | 180 | 270;
  img = rotate(img, rot);
  const c = [...t].reverse().find((x) => x.type === 'crop');
  if (c && c.type === 'crop') img = crop(img, c.x, c.y, c.w, c.h);
  img = downsample(img);
  for (const m of t) if (m.type === 'mask') applyMask(img, m.shape, m.x, m.y, m.w, m.h);
  return img;
}

/** Produce the public derivative JPEG from original JPEG bytes. */
export function renderPublicDerivative(originalJpeg: Uint8Array, t: Transformation[], quality = 88): { bytes: Uint8Array; width: number; height: number } {
  const img = applyTransformations(decodeJpeg(originalJpeg), t);
  return { bytes: encodeJpeg(img, quality), width: img.width, height: img.height };
}

/** Lists JPEG marker segments — used by tests and the export inspector to prove metadata is absent. */
export function jpegSegments(bytes: Uint8Array): { marker: string; length: number; tag?: string }[] {
  const out: { marker: string; length: number; tag?: string }[] = [];
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return out;
  let p = 2;
  while (p < bytes.length - 3) {
    if (bytes[p] !== 0xff) break;
    const m = bytes[p + 1];
    if (m === 0xda) {
      out.push({ marker: 'SOS', length: 0 });
      break;
    }
    const len = (bytes[p + 2] << 8) | bytes[p + 3];
    let tag: string | undefined;
    if (m >= 0xe0 && m <= 0xef) {
      tag = String.fromCharCode(...bytes.subarray(p + 4, Math.min(p + 4 + 12, p + 2 + len))).replace(/[^\x20-\x7e]/g, '');
    }
    out.push({ marker: `0x${m.toString(16).toUpperCase()}`, length: len, tag });
    p += 2 + len;
  }
  return out;
}

export function hasSensitiveMetadata(bytes: Uint8Array): string[] {
  const issues: string[] = [];
  for (const s of jpegSegments(bytes)) {
    if (s.marker === '0xE1') issues.push(`APP1 segment (${s.tag?.startsWith('Exif') ? 'EXIF' : s.tag?.includes('http') ? 'XMP' : 'APP1'})`);
    if (s.marker === '0xED') issues.push('APP13 (IPTC/Photoshop)');
    if (s.marker === '0xE2') issues.push('APP2 (ICC/FlashPix)');
    if (s.marker === '0xFE') issues.push('COM comment');
  }
  return issues;
}
