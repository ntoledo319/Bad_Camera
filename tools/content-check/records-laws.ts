#!/usr/bin/env tsx
/**
 * Public-records law data: all 50 states + DC, each with law name, citation and an https official
 * URL; codes unique; and the request builder cites each one. Prints RECORDS LAWS COMPLETE.
 */
import { RECORDS_LAWS } from '../../content/legal/recordsLaws';
import { buildRecordsRequest } from '../../src/domain/records';

const EXPECTED = 'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
const problems: string[] = [];
const codes = RECORDS_LAWS.map((l) => l.code);
for (const c of EXPECTED) if (!codes.includes(c)) problems.push(`missing ${c}`);
for (const c of codes) if (!EXPECTED.includes(c)) problems.push(`unexpected code ${c}`);
if (new Set(codes).size !== codes.length) problems.push('duplicate codes');
for (const l of RECORDS_LAWS) {
  if (l.lawName.trim().length < 8) problems.push(`${l.code}: law name too short`);
  if (!/\d/.test(l.citation) || l.citation.length < 8) problems.push(`${l.code}: citation looks wrong (${l.citation})`);
  try {
    if (new URL(l.officialUrl).protocol !== 'https:') problems.push(`${l.code}: official URL not https`);
  } catch {
    problems.push(`${l.code}: invalid official URL`);
  }
  if (!l.verified && !l.notes.trim()) problems.push(`${l.code}: unverified without a note`);
  const draft = buildRecordsRequest({ agency: 'X', system: 'Y', dateRange: 'Z', categories: ['contracts'], feeLimit: '$1', signature: '', jurisdiction: l.code });
  const cited = l.code === 'CT' ? draft.body.includes('§ 1-210') : draft.body.includes(l.citation) && draft.body.includes(l.lawName);
  if (!cited) problems.push(`${l.code}: request builder does not cite the law`);
}
const generic = buildRecordsRequest({ agency: 'X', system: 'Y', dateRange: 'Z', categories: ['contracts'], feeLimit: '$1', signature: '', jurisdiction: 'generic' });
if (/This request is made under/.test(generic.body)) problems.push('generic draft must not cite a law');
console.log(`${RECORDS_LAWS.length} jurisdictions, ${RECORDS_LAWS.filter((l) => l.verified).length} verified against official text, ${RECORDS_LAWS.filter((l) => l.responseTime).length} with a stated deadline`);
if (problems.length) {
  for (const p of problems) console.log('FAIL', p);
  process.exit(1);
}
console.log('RECORDS LAWS COMPLETE');
