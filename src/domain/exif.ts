/**
 * Minimal, bounds-checked EXIF reader for JPEG (APP1 "Exif\0\0" TIFF).
 * Extracts only what the app labels as *photo metadata* (never "verified"):
 * DateTimeOriginal, OffsetTimeOriginal, GPS lat/lon, Make, Model.
 * Results are stored privately and never exported by default.
 */
export interface PhotoMetadata {
  dateTimeOriginal: string | null; // "YYYY-MM-DDTHH:MM:SS" local, as written by the camera
  offsetTime: string | null;
  gps: { lat: number; lon: number } | null;
  make: string | null;
  model: string | null;
}

const EMPTY: PhotoMetadata = { dateTimeOriginal: null, offsetTime: null, gps: null, make: null, model: null };

export function readExif(bytes: Uint8Array): PhotoMetadata {
  try {
    return parse(bytes);
  } catch {
    return { ...EMPTY };
  }
}

function parse(b: Uint8Array): PhotoMetadata {
  if (b[0] !== 0xff || b[1] !== 0xd8) return { ...EMPTY };
  let p = 2;
  while (p + 4 < b.length && b[p] === 0xff) {
    const m = b[p + 1];
    const len = (b[p + 2] << 8) | b[p + 3];
    if (m === 0xda || len < 2) break;
    if (m === 0xe1 && b[p + 4] === 0x45 && b[p + 5] === 0x78 && b[p + 6] === 0x69 && b[p + 7] === 0x66) return tiff(b.subarray(p + 10, Math.min(b.length, p + 2 + len)));
    p += 2 + len;
  }
  return { ...EMPTY };
}

function tiff(t: Uint8Array): PhotoMetadata {
  const le = t[0] === 0x49 && t[1] === 0x49;
  if (!le && !(t[0] === 0x4d && t[1] === 0x4d)) return { ...EMPTY };
  const u16 = (o: number) => {
    if (o + 2 > t.length) throw new RangeError('exif');
    return le ? t[o] | (t[o + 1] << 8) : (t[o] << 8) | t[o + 1];
  };
  const u32 = (o: number) => {
    if (o + 4 > t.length) throw new RangeError('exif');
    return le ? (t[o] | (t[o + 1] << 8) | (t[o + 2] << 16) | (t[o + 3] << 24)) >>> 0 : ((t[o] << 24) | (t[o + 1] << 16) | (t[o + 2] << 8) | t[o + 3]) >>> 0;
  };
  type Entry = { tag: number; type: number; count: number; valOff: number };
  const ifd = (off: number): Entry[] => {
    const n = u16(off);
    if (n > 512) throw new RangeError('exif');
    const out: Entry[] = [];
    for (let i = 0; i < n; i++) {
      const e = off + 2 + i * 12;
      const type = u16(e + 2);
      const count = u32(e + 4);
      const size = ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 } as Record<number, number>)[type] ?? 1;
      out.push({ tag: u16(e), type, count, valOff: size * count <= 4 ? e + 8 : u32(e + 8) });
    }
    return out;
  };
  const ascii = (e: Entry) => {
    const end = Math.min(t.length, e.valOff + Math.min(e.count, 256));
    let s = '';
    for (let i = e.valOff; i < end && t[i] !== 0; i++) s += String.fromCharCode(t[i]);
    return s.trim();
  };
  const rationals = (e: Entry) => Array.from({ length: Math.min(e.count, 4) }, (_, i) => {
    const d = u32(e.valOff + i * 8 + 4);
    return d ? u32(e.valOff + i * 8) / d : 0;
  });
  const res: PhotoMetadata = { ...EMPTY };
  const ifd0 = ifd(u32(4));
  let exifOff = 0, gpsOff = 0;
  for (const e of ifd0) {
    if (e.tag === 0x010f) res.make = ascii(e) || null;
    if (e.tag === 0x0110) res.model = ascii(e) || null;
    if (e.tag === 0x8769) exifOff = u32(e.valOff);
    if (e.tag === 0x8825) gpsOff = u32(e.valOff);
    if (e.tag === 0x0132 && !res.dateTimeOriginal) res.dateTimeOriginal = exifDate(ascii(e));
  }
  if (exifOff) for (const e of ifd(exifOff)) {
    if (e.tag === 0x9003) res.dateTimeOriginal = exifDate(ascii(e)) ?? res.dateTimeOriginal;
    if (e.tag === 0x9011) res.offsetTime = ascii(e) || null;
  }
  if (gpsOff) {
    let latRef = 'N', lonRef = 'E', lat: number[] | null = null, lon: number[] | null = null;
    for (const e of ifd(gpsOff)) {
      if (e.tag === 1) latRef = ascii(e) || 'N';
      if (e.tag === 2) lat = rationals(e);
      if (e.tag === 3) lonRef = ascii(e) || 'E';
      if (e.tag === 4) lon = rationals(e);
    }
    if (lat && lon) {
      const dms = (a: number[]) => a[0] + (a[1] ?? 0) / 60 + (a[2] ?? 0) / 3600;
      const la = dms(lat) * (latRef === 'S' ? -1 : 1);
      const lo = dms(lon) * (lonRef === 'W' ? -1 : 1);
      if (Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180 && !(la === 0 && lo === 0)) res.gps = { lat: la, lon: lo };
    }
  }
  return res;
}

function exifDate(s: string): string | null {
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : null;
}

/** JPEG pixel size from SOF without decoding. */
export function jpegSize(b: Uint8Array): { width: number; height: number } | null {
  if (b[0] !== 0xff || b[1] !== 0xd8) return null;
  let p = 2;
  while (p + 9 < b.length && b[p] === 0xff) {
    const m = b[p + 1];
    const len = (b[p + 2] << 8) | b[p + 3];
    if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) return { height: (b[p + 5] << 8) | b[p + 6], width: (b[p + 7] << 8) | b[p + 8] };
    if (m === 0xda || len < 2) break;
    p += 2 + len;
  }
  return null;
}
