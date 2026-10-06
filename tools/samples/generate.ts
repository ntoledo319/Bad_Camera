#!/usr/bin/env tsx
/**
 * Generate clearly-marked DEMONSTRATION sample exports into artifacts/samples/:
 *  - social cards (portrait/square/story/wide) PNG + SVG, photo and schematic variants
 *  - captions.txt
 *  - evidence ZIP (public-default) + verification output
 *  - report.pdf / report.html extracted from the ZIP
 *  - a tampered ZIP to demonstrate failure
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { strToU8 } from 'fflate';
import { DEMO_INSTALLATION, DEMO_CLAIMS, DEMO_SOURCE, DEMO_PHOTO_SOURCE, demoObservationRevisions } from '../../src/domain/demo';
import { buildEvidenceZip, verifyEvidenceZip } from '../../src/domain/evidence';
import { projectPublic, captions, DEFAULT_DISCLOSURE } from '../../src/domain/projection';
import { renderCard, PRESETS, type CardPreset } from '../../src/domain/card';
import { renderPublicDerivative, hasSensitiveMetadata, jpegSegments } from '../../src/domain/image';
import { schematicFor } from '../../src/domain/schematics';
import { sha256Hex } from '../../src/domain/hash';
import { writeZipDeterministic, readZipSafely } from '../../src/domain/safezip';

const OUT = join(process.cwd(), 'artifacts', 'samples');
mkdirSync(OUT, { recursive: true });

async function main() {
  const original = new Uint8Array(readFileSync(join(process.cwd(), 'tests/fixtures/demo-photo-with-exif.jpg')));
  const revs = demoObservationRevisions();
  const obs = revs[revs.length - 1];
  const transformations = [{ type: 'mask' as const, shape: 'rect' as const, x: 0.02, y: 0.02, w: 0.6, h: 0.06 }];
  const sources = [DEMO_SOURCE, DEMO_PHOTO_SOURCE];
  const log: string[] = [];

  log.push(`original fixture: ${original.length} bytes sha256=${sha256Hex(original)} sensitive segments=${hasSensitiveMetadata(original).join(',') || 'none'}`);
  const deriv = renderPublicDerivative(original, transformations);
  writeFileSync(join(OUT, 'approved-derivative-demo.jpg'), deriv.bytes);
  log.push(`derivative: ${deriv.width}x${deriv.height} ${deriv.bytes.length} bytes segments=${jpegSegments(deriv.bytes).map((s) => s.marker).join(' ')} sensitive=${hasSensitiveMetadata(deriv.bytes).join(',') || 'none'}`);

  const projection = projectPublic({ observation: obs, sources, claims: DEMO_CLAIMS, installation: DEMO_INSTALLATION }, DEFAULT_DISCLOSURE);
  const dataUri = `data:image/jpeg;base64,${Buffer.from(deriv.bytes).toString('base64')}`;
  for (const preset of Object.keys(PRESETS) as CardPreset[]) {
    for (const variant of ['photo', 'schematic'] as const) {
      const card = renderCard({ projection, preset, photoDataUri: variant === 'photo' ? dataUri : null, schematicSvg: schematicFor('solar-box-pole') });
      const png = new Resvg(card.svg, { font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' }, fitTo: { mode: 'original' } }).render().asPng();
      const name = `card-${preset}-${variant}`;
      writeFileSync(join(OUT, `${name}.png`), png);
      if (variant === 'photo') writeFileSync(join(OUT, `${name}.svg`), card.svg.replace(/data:image\/jpeg;base64,[A-Za-z0-9+/=]+/g, 'approved-derivative-demo.jpg'));
      else writeFileSync(join(OUT, `${name}.svg`), card.svg);
      log.push(`${name}: ${card.width}x${card.height} png=${png.length} bytes overflow=${card.overflow.length ? card.overflow.join('; ') : 'none'}`);
    }
  }
  const cap = captions(projection);
  writeFileSync(join(OUT, 'captions.txt'), `NEUTRAL\n${cap.neutral}\n\nQUESTION\n${cap.question}\n\nALT TEXT\n${cap.alt}\n`);

  const ev = await buildEvidenceZip({
    observation: obs,
    sources,
    claims: DEMO_CLAIMS,
    installation: DEMO_INSTALLATION,
    photos: [{ attachment: { id: 'demo-attachment-1', sha256: sha256Hex(original), mime: 'image/jpeg', transformations, redactionReviewedAt: '2026-09-15T09:05:00.000Z' }, originalBytes: original }],
    revisions: revs.map((r) => ({ revision: r.revision, revisionHash: r.revisionHash, previousRevisionHash: r.previousRevisionHash, recordedAt: r.deviceRecordedAt, reason: r.revisionReason })),
    createdAt: '2026-09-15T09:10:00.000Z',
    exportId: 'demo-export-0001',
  });
  writeFileSync(join(OUT, 'sightline-evidence-DEMO.zip'), ev.zip);
  writeFileSync(join(OUT, 'report-DEMO.pdf'), ev.files['report.pdf']);
  writeFileSync(join(OUT, 'report-DEMO.html'), ev.files['report.html']);
  writeFileSync(join(OUT, 'manifest-DEMO.json'), ev.files['manifest.json']);
  log.push(`evidence zip: ${ev.zip.length} bytes sha256=${ev.zipSha256} files=${Object.keys(ev.files).length}`);

  // leakage scan over every file in the public zip
  const entries = readZipSafely(ev.zip);
  const forbidden = ['DEMO NOTE', '41.14905', '-73.25102', 'DemoPhone', 'DemoMake', 'demo-photo-with-exif'];
  for (const [name, bytes] of entries) {
    const text = Buffer.from(bytes).toString('latin1');
    for (const f of forbidden) if (text.includes(f)) log.push(`LEAK ${f} in ${name}`);
    if (name.endsWith('.jpg') && hasSensitiveMetadata(bytes).length) log.push(`LEAK metadata in ${name}`);
  }
  log.push('leak scan complete');

  const v = verifyEvidenceZip(ev.zip);
  log.push(`verify original: ${v.status} — ${v.headline}`);
  // tampered copy: change README bytes, keep manifest
  const files = Object.fromEntries(entries);
  files['README.txt'] = strToU8(Buffer.from(files['README.txt']).toString('utf8') + '\nedited\n');
  const tampered = writeZipDeterministic(files);
  writeFileSync(join(OUT, 'sightline-evidence-DEMO-TAMPERED.zip'), tampered);
  const vt = verifyEvidenceZip(tampered);
  log.push(`verify tampered: ${vt.status} — ${vt.headline} — ${vt.details.filter((d) => !d.startsWith('OK')).join('; ')}`);

  writeFileSync(join(OUT, 'generation-log.txt'), log.join('\n') + '\n');
  console.log(log.join('\n'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
