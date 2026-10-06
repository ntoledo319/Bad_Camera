#!/usr/bin/env tsx
/**
 * Standalone Sightline evidence-package verifier. No app, account or network needed.
 *   npx tsx tools/verify-evidence/verify.ts package.zip [--json]
 * Exit codes: 0 match, 1 mismatch, 2 unsafe/unsupported/malformed, 64 usage.
 */
import { readFileSync, statSync } from 'node:fs';
import { verifyEvidenceZip, VERIFY_EXPLANATION } from '../../src/domain/evidence';
import { DEFAULT_ZIP_LIMITS } from '../../src/domain/safezip';

const file = process.argv[2];
if (!file) {
  console.error('usage: verify.ts <package.zip> [--json]');
  process.exit(64);
}
const size = statSync(file).size;
if (size > DEFAULT_ZIP_LIMITS.maxArchiveBytes) {
  console.error(`Archive is ${size} bytes; limit is ${DEFAULT_ZIP_LIMITS.maxArchiveBytes}.`);
  process.exit(2);
}
const r = verifyEvidenceZip(new Uint8Array(readFileSync(file)));
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ...r, manifest: r.manifest ? { exportId: r.manifest.exportId, recordId: r.manifest.recordId, profile: r.manifest.selectedDisclosureProfile } : null }, null, 2));
} else {
  console.log(r.headline);
  if (r.demonstration) console.log('NOTE: this package is marked as DEMONSTRATION data.');
  console.log(`ZIP SHA-256: ${r.zipSha256}`);
  for (const d of r.details) console.log(`  ${d}`);
  console.log('');
  console.log(VERIFY_EXPLANATION);
}
process.exit(r.status === 'match' ? 0 : r.status === 'mismatch' ? 1 : 2);
