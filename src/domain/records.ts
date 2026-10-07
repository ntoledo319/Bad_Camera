/**
 * Public-records request template (spec §15). Generated locally; never transmitted.
 * No invented officials, addresses, deadlines, fee waivers or personal identifiers.
 * Citations come from content/legal/recordsLaws.ts (all 50 states + DC, researched 2026-10-06).
 */
import { RECORDS_LAW_BY_CODE } from '../../content/legal/recordsLaws';
export const RECORD_CATEGORIES = [
  { id: 'contracts', label: 'Contracts and amendments' },
  { id: 'purchase', label: 'Purchase records' },
  { id: 'locations', label: 'Existing deployment/location records to the extent disclosable' },
  { id: 'policies', label: 'Written use and retention policies' },
  { id: 'sharing', label: 'Data-sharing agreements' },
  { id: 'audits', label: 'Audit policies and existing audit reports' },
  { id: 'stats', label: 'Existing aggregate usage statistics' },
  { id: 'reports', label: 'Annual or periodic usage reports' },
] as const;
export type RecordCategoryId = (typeof RECORD_CATEGORIES)[number]['id'];

export interface RecordsRequestInput {
  agency: string;
  system: string;
  dateRange: string;
  categories: RecordCategoryId[];
  feeLimit: string;
  signature: string;
  /** Two-letter state code (or 'DC') from RECORDS_LAWS, or 'generic' for no citation. */
  jurisdiction: string;
}

export const PLACEHOLDER = (s: string) => `[${s}]`;

export function buildRecordsRequest(i: RecordsRequestInput): { subject: string; body: string; missing: string[] } {
  const agency = i.agency.trim() || PLACEHOLDER('agency');
  const system = i.system.trim() || PLACEHOLDER('camera/system/program');
  const range = i.dateRange.trim() || PLACEHOLDER('date range');
  const fee = i.feeLimit.trim() || PLACEHOLDER('amount');
  const cats = RECORD_CATEGORIES.filter((c) => i.categories.includes(c.id)).map((c) => c.label);
  const catText = cats.length ? cats.map((c) => `- ${c}`).join('\n') : PLACEHOLDER('Select at least one category of records');
  const law = RECORDS_LAW_BY_CODE[i.jurisdiction];
  let legal = '';
  if (i.jurisdiction === 'CT') {
    legal =
      '\nThis request is made under the Connecticut Freedom of Information Act, Conn. Gen. Stat. § 1-200 et seq., including § 1-210. Public Act 26-14, Sec. 13(e)(2), provides that locations of automated license plate reader cameras (subject to a stated exception) and data derived from audits, usage logs and access logs (with plate-reader data redacted) are public records.\n';
  } else if (law) {
    legal = `\nThis request is made under the ${law.lawName}, ${law.citation}.\n`;
  }
  const body = `Hello,

I request electronic copies of existing records concerning ${agency}'s use of ${system} for ${range}:

${catText}
${legal}
Please provide reasonably segregable nonexempt portions if any material is withheld and identify the legal basis for withholding. I prefer electronic delivery in the records' existing electronic format where available. Please contact me before incurring fees exceeding ${fee}. If another office holds these records, please let me know the appropriate contact.

Thank you,
${i.signature.trim() || PLACEHOLDER('Your name and contact — optional until sending')}
`;
  const missing: string[] = [];
  if (!i.agency.trim()) missing.push('agency');
  if (!i.system.trim()) missing.push('system');
  if (!i.dateRange.trim()) missing.push('date range');
  if (!cats.length) missing.push('categories');
  if (!i.feeLimit.trim()) missing.push('fee limit');
  return { subject: `Public-records request concerning ${agency}'s ${system}`, body, missing };
}
