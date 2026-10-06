/**
 * Evidence report renderer (pdf-lib). Real text, selectable link annotations, page numbers,
 * generous margins, 11pt body. The PDF is NOT tagged; a parallel accessible HTML report is
 * always produced alongside it, and the app never labels the PDF as fully accessible.
 * Only the public projection and approved derivatives are used.
 */
import { PDFDocument, StandardFonts, rgb, PDFName, PDFString, type PDFFont, type PDFPage } from 'pdf-lib';
import type { PublicProjection } from './projection';
import { DEMO_BANNER } from './projection';
import { esc } from './card';

export interface ReportInput {
  projection: PublicProjection;
  photos: { name: string; jpeg: Uint8Array; width: number; height: number; sha256: string }[];
  chronology: { when: string; what: string }[];
  methodology: string[];
  checksums: { path: string; sha256: string }[];
  generatedAtText: string;
}

const INK = rgb(0x17 / 255, 0x26 / 255, 0x24 / 255);
const INK2 = rgb(0x53 / 255, 0x65 / 255, 0x60 / 255);
const TEAL = rgb(0x14 / 255, 0x67 / 255, 0x5f / 255);
const OCHRE = rgb(0x8c / 255, 0x5a / 255, 0x12 / 255);
const OCHRE_BG = rgb(1, 0xf1 / 255, 0xd3 / 255);
const RULE = rgb(0xdc / 255, 0xe3 / 255, 0xdc / 255);

/** Map characters outside WinAnsi to safe equivalents for the standard fonts. */
export function winAnsi(s: string): string {
  return s
    .replace(/≠/g, 'is not')
    .replace(/→/g, '->')
    .replace(/[≈]/g, '~')
    .replace(/[\u2264]/g, '<=')
    .replace(/[\u2265]/g, '>=')
    .replace(/[\u00b2]/g, '2')
    .replace(/[\u00b3]/g, '3')
    .replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2022\u2026\u20ac\u00b7]/g, '?');
}

class Writer {
  doc: PDFDocument;
  page!: PDFPage;
  y = 0;
  pages: PDFPage[] = [];
  readonly W = 612;
  readonly H = 792;
  readonly M = 64;
  constructor(
    doc: PDFDocument,
    public font: PDFFont,
    public bold: PDFFont,
    public demo: boolean,
  ) {
    this.doc = doc;
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage([this.W, this.H]);
    this.pages.push(this.page);
    this.y = this.H - this.M;
    if (this.demo) {
      this.page.drawRectangle({ x: this.M, y: this.H - 40, width: this.W - 2 * this.M, height: 22, color: OCHRE_BG, borderColor: OCHRE, borderWidth: 1 });
      this.page.drawText(winAnsi(DEMO_BANNER), { x: this.M + 8, y: this.H - 33, size: 10, font: this.bold, color: OCHRE });
      this.y = this.H - this.M - 8;
    }
  }
  ensure(h: number) {
    if (this.y - h < this.M + 24) this.newPage();
  }
  wrapLines(text: string, size: number, font: PDFFont, width: number): string[] {
    const words = winAnsi(text).split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (font.widthOfTextAtSize(t, size) <= width) cur = t;
      else {
        if (cur) lines.push(cur);
        let piece = w;
        while (font.widthOfTextAtSize(piece, size) > width) {
          let n = piece.length;
          while (n > 1 && font.widthOfTextAtSize(piece.slice(0, n), size) > width) n--;
          lines.push(piece.slice(0, n));
          piece = piece.slice(n);
        }
        cur = piece;
      }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }
  text(t: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; width?: number; gap?: number; link?: string | null } = {}) {
    const size = opts.size ?? 11;
    const font = opts.bold ? this.bold : this.font;
    const x = opts.x ?? this.M;
    const width = opts.width ?? this.W - x - this.M;
    const lh = size * 1.45;
    for (const line of this.wrapLines(t, size, font, width)) {
      this.ensure(lh);
      this.page.drawText(line, { x, y: this.y - size, size, font, color: opts.color ?? INK });
      if (opts.link) this.addLink(x, this.y - size - 2, font.widthOfTextAtSize(line, size), size + 4, opts.link);
      this.y -= lh;
    }
    this.y -= opts.gap ?? 4;
  }
  addLink(x: number, y: number, w: number, h: number, url: string) {
    const ctx = this.doc.context;
    const annot = ctx.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + w, y + h],
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    });
    const ref = ctx.register(annot);
    const existing = this.page.node.lookup(PDFName.of('Annots'));
    if (existing && 'push' in (existing as object)) (existing as unknown as { push: (r: unknown) => void }).push(ref);
    else this.page.node.set(PDFName.of('Annots'), ctx.obj([ref]));
  }
  rule() {
    this.ensure(12);
    this.page.drawLine({ start: { x: this.M, y: this.y - 4 }, end: { x: this.W - this.M, y: this.y - 4 }, thickness: 0.75, color: RULE });
    this.y -= 14;
  }
  heading(t: string) {
    this.ensure(40);
    this.y -= 6;
    this.text(t, { size: 15, bold: true, gap: 6 });
  }
}

export async function renderReportPdf(input: ReportInput): Promise<Uint8Array> {
  const p = input.projection;
  const doc = await PDFDocument.create();
  // Deterministic metadata: no producer/creator device strings, fixed dates.
  doc.setTitle(winAnsi(`Sightline evidence report — ${p.headline}`));
  doc.setSubject('Sightline evidence report');
  doc.setProducer('Sightline');
  doc.setCreator('Sightline');
  doc.setAuthor('');
  doc.setKeywords([]);
  doc.setLanguage('en-US');
  const fixed = new Date('2000-01-01T00:00:00Z');
  doc.setCreationDate(fixed);
  doc.setModificationDate(fixed);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold, p.demonstration);

  // ---- Page 1: one-page summary
  w.page.drawCircle({ x: w.M + 9, y: w.y - 9, size: 9, borderColor: TEAL, borderWidth: 3 });
  w.page.drawCircle({ x: w.M + 9, y: w.y - 9, size: 3, color: TEAL });
  w.page.drawText('Sightline · Evidence report', { x: w.M + 26, y: w.y - 13, size: 11, font: bold, color: TEAL });
  w.y -= 34;
  w.text(p.headline, { size: 22, bold: true, gap: 10 });
  const facts: [string, string][] = [
    ['Type', p.categoryLabel],
    ['Identification', p.identification.familyLabel ?? 'Not identified'],
    ['Identification basis', p.identification.basisLabel],
    ['Source status', p.sourceStatus],
    ['Location', p.placeLabel ?? 'Not disclosed'],
    ['Equipment coordinates', p.equipmentCoordinates ? `${p.equipmentCoordinates.lat}, ${p.equipmentCoordinates.lon} (WGS84; ${p.equipmentCoordinates.method.replace('_', ' ')})` : 'Not disclosed in this export'],
    ['Observed', p.observedDateText ?? 'Not disclosed'],
    ['Source retrieved', p.sourceRetrievedText ?? 'Not applicable'],
    ['Last in-person check in source', p.lastSourceObservationText ?? 'Not established'],
    ['Record', `${p.recordId} (revision ${p.recordRevision})`],
    ['Report generated', input.generatedAtText],
  ];
  if (p.observerDistanceText) facts.push(['Distance', p.observerDistanceText]);
  for (const [k, v] of facts) {
    const startY = w.y;
    w.text(k, { size: 10, bold: true, color: INK2, width: 150, gap: 0 });
    const afterLabel = w.y;
    w.y = startY;
    w.text(v, { size: 11, x: w.M + 160, gap: 2 });
    w.y = Math.min(w.y, afterLabel);
  }
  w.rule();
  w.text('What this report does not establish', { size: 12, bold: true, gap: 4 });
  for (const l of p.limitations) w.text(`•  ${l}`, { size: 10.5, gap: 1 });
  w.y -= 6;
  w.text(p.footerAccessible, { size: 11, bold: true, color: OCHRE });

  // ---- Appendix A: photos
  if (input.photos.length) {
    w.newPage();
    w.heading('Appendix A — Approved redacted photographs');
    w.text('These are rasterized public derivatives with metadata removed. Originals are held privately by the observer and are not included.', { size: 10, color: INK2 });
    for (const ph of input.photos) {
      const img = await doc.embedJpg(ph.jpeg);
      const maxW = w.W - 2 * w.M;
      const maxH = 380;
      const sc = Math.min(maxW / ph.width, maxH / ph.height, 1);
      const dw = ph.width * sc;
      const dh = ph.height * sc;
      w.ensure(dh + 40);
      w.page.drawImage(img, { x: w.M, y: w.y - dh, width: dw, height: dh });
      w.y -= dh + 8;
      w.text(`${ph.name} · ${ph.width}×${ph.height} · SHA-256 ${ph.sha256}`, { size: 8.5, color: INK2, gap: 10 });
    }
  }

  // ---- Appendix B: claims & sources
  w.newPage();
  w.heading('Appendix B — Claims and sources');
  w.text('Each claim is attributed to a source and labelled with how it is known. A source link is not a verified claim by itself.', { size: 10, color: INK2 });
  if (!p.claims.length) w.text('No source claims included in this export.', { size: 10.5 });
  for (const c of p.claims) {
    w.text(`${c.fieldPath}: ${String(c.value)}`, { size: 10.5, bold: true, gap: 0 });
    w.text(`Basis: ${c.basis} · Status: ${c.status} · Source: ${c.sourceId}`, { size: 9, color: INK2, gap: 6 });
  }
  w.rule();
  for (const s of p.sources) {
    w.text(s.title, { size: 10.5, bold: true, gap: 0 });
    w.text(`${s.publisher} · kind: ${s.kind} · accessed ${s.accessedAt.slice(0, 10)}${s.licenseId ? ' · license ' + s.licenseId : ''}`, { size: 9, color: INK2, gap: 0 });
    if (s.url) w.text(s.url, { size: 9, color: TEAL, link: s.url, gap: 8 });
  }
  if (p.attribution.length) {
    w.rule();
    for (const a of p.attribution) w.text(a, { size: 9.5, color: INK2 });
  }

  // ---- Appendix C: chronology
  w.heading('Appendix C — Chronology');
  for (const c of input.chronology) w.text(`${c.when} — ${c.what}`, { size: 10 });

  // ---- Appendix D: methodology & checksums
  w.newPage();
  w.heading('Appendix D — Methodology');
  for (const m of input.methodology) w.text(m, { size: 10 });
  w.heading('Appendix E — Checksums');
  w.text('SHA-256 of the media files in this package at the time of export. Matching checksums show files are unchanged relative to this list; they do not prove the event is authentic.', { size: 10, color: INK2 });
  for (const c of input.checksums) w.text(`${c.sha256}  ${c.path}`, { size: 8.5 });

  // Page numbers
  const total = w.pages.length;
  w.pages.forEach((pg, i) => {
    const t = `Page ${i + 1} of ${total}`;
    pg.drawText(t, { x: w.W - w.M - font.widthOfTextAtSize(t, 9), y: 30, size: 9, font, color: INK2 });
    pg.drawText('Sightline · Location report is not proof of recording', { x: w.M, y: 30, size: 9, font, color: INK2 });
  });
  return doc.save({ useObjectStreams: false });
}

export function renderReportHtml(input: ReportInput, photoHrefs: string[]): string {
  const p = input.projection;
  const li = (a: string[]) => a.map((x) => `<li>${esc(x)}</li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.headline)} — Sightline evidence report</title>
<style>body{font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#172624;background:#F6F4EE;max-width:46rem;margin:2rem auto;padding:0 1.25rem}h1{font-size:2rem;line-height:1.2}h2{margin-top:2rem}dt{font-weight:600;color:#536560}dd{margin:0 0 .75rem}.demo{background:#FFF1D3;color:#8C5A12;border:1px solid #8C5A12;padding:.5rem 1rem;border-radius:12px;font-weight:700}img{max-width:100%;height:auto;border-radius:12px}code{font-size:.8rem;word-break:break-all}a{color:#14675F}</style></head><body>
${p.demonstration ? `<p class="demo" role="alert">${esc(DEMO_BANNER)}</p>` : ''}
<header><p>Sightline · Evidence report (accessible HTML version)</p><h1>${esc(p.headline)}</h1></header>
<main>
<section aria-labelledby="sum"><h2 id="sum">Summary</h2><dl>
<dt>Type</dt><dd>${esc(p.categoryLabel)}</dd>
<dt>Identification</dt><dd>${esc(p.identification.familyLabel ?? 'Not identified')} — ${esc(p.identification.basisLabel)}</dd>
<dt>Source status</dt><dd>${esc(p.sourceStatus)}</dd>
<dt>Location</dt><dd>${esc(p.placeLabel ?? 'Not disclosed')}</dd>
<dt>Equipment coordinates</dt><dd>${p.equipmentCoordinates ? `${p.equipmentCoordinates.lat}, ${p.equipmentCoordinates.lon} (WGS84)` : 'Not disclosed in this export'}</dd>
<dt>Observed</dt><dd>${esc(p.observedDateText ?? 'Not disclosed')}</dd>
<dt>Source retrieved</dt><dd>${esc(p.sourceRetrievedText ?? 'Not applicable')}</dd>
<dt>Record</dt><dd>${esc(p.recordId)} (revision ${p.recordRevision})</dd>
<dt>Generated</dt><dd>${esc(input.generatedAtText)}</dd>
</dl></section>
<section aria-labelledby="lim"><h2 id="lim">What this report does not establish</h2><ul>${li(p.limitations)}</ul><p><strong>${esc(p.footerAccessible)}</strong></p></section>
${input.photos.length ? `<section aria-labelledby="ph"><h2 id="ph">Approved redacted photographs</h2>${input.photos.map((ph, i) => `<figure><img src="${esc(photoHrefs[i] ?? '')}" alt="Redacted photograph ${i + 1} of the documented equipment. Sensitive areas are covered by solid masks."><figcaption><code>${esc(ph.name)} SHA-256 ${ph.sha256}</code></figcaption></figure>`).join('')}</section>` : ''}
<section aria-labelledby="cl"><h2 id="cl">Claims</h2><ul>${p.claims.map((c) => `<li><strong>${esc(c.fieldPath)}</strong>: ${esc(String(c.value))} <br><small>Basis ${esc(c.basis)} · status ${esc(c.status)} · source ${esc(c.sourceId)}</small></li>`).join('') || '<li>None included.</li>'}</ul></section>
<section aria-labelledby="src"><h2 id="src">Sources</h2><ul>${p.sources.map((s) => `<li>${esc(s.title)} — ${esc(s.publisher)} (${esc(s.kind)}, accessed ${esc(s.accessedAt.slice(0, 10))})${s.url ? ` <a href="${esc(s.url)}">${esc(s.url)}</a>` : ''}</li>`).join('') || '<li>None.</li>'}</ul>${p.attribution.map((a) => `<p>${esc(a)}</p>`).join('')}</section>
<section aria-labelledby="chr"><h2 id="chr">Chronology</h2><ol>${input.chronology.map((c) => `<li>${esc(c.when)} — ${esc(c.what)}</li>`).join('')}</ol></section>
<section aria-labelledby="met"><h2 id="met">Methodology</h2>${input.methodology.map((m) => `<p>${esc(m)}</p>`).join('')}</section>
<section aria-labelledby="chk"><h2 id="chk">Checksums</h2><ul>${input.checksums.map((c) => `<li><code>${c.sha256}</code> ${esc(c.path)}</li>`).join('')}</ul></section>
</main></body></html>`;
}

export const METHODOLOGY_TEXT: string[] = [
  'Sightline separates three things: what a source document says, what the observer directly saw, and what is inferred. Each claim carries its basis and source.',
  'Equipment position and photographer position are stored separately. Distance, when shown, is an approximate straight-line (Haversine, R = 6,371,008.8 m) distance between two coordinates, not a measure of any camera\u2019s field of view.',
  'Original photographs are kept unmodified in the observer\u2019s private notebook with a SHA-256 digest computed at acquisition. Shared images are newly rasterized derivatives: crops and solid masks are burnt in, and EXIF/XMP/IPTC metadata and embedded thumbnails are not written.',
  'Map records from OpenStreetMap are community contributions under the ODbL. They can be incomplete, outdated or wrong. Absence of a record does not mean absence of equipment.',
];
