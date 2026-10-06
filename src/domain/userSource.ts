/**
 * Sources the user attaches by hand (a news story, an agency document, a manufacturer page).
 * Sightline never fetches these links; they are stored as typed text and labelled "added by you".
 */
import { Source } from './schemas';
import { uuidv4 } from './hash';

export type UserSourceKind = 'officialRecord' | 'news' | 'manufacturer' | 'other';

export const USER_SOURCE_KIND_LABEL: Record<UserSourceKind, string> = {
  officialRecord: 'Official record',
  news: 'News report',
  manufacturer: 'Manufacturer page',
  other: 'Other',
};

export interface UserSourceInput {
  title: string;
  url: string;
  kind: UserSourceKind;
  section?: string;
}

/** Only http(s) URLs, no credentials, bounded length. Returns the normalised URL or an error message. */
export function validateSourceUrl(raw: string): { ok: true; url: string } | { ok: false; message: string } {
  const s = raw.trim();
  if (!s) return { ok: false, message: 'Enter a link.' };
  if (s.length > 2000) return { ok: false, message: 'That link is too long.' };
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
  } catch {
    return { ok: false, message: 'That does not look like a web link.' };
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { ok: false, message: 'Only http and https links can be attached.' };
  if (u.username || u.password) return { ok: false, message: 'Links containing a username or password are not accepted.' };
  if (!u.hostname.includes('.')) return { ok: false, message: 'That does not look like a public web address.' };
  return { ok: true, url: u.toString() };
}

export function makeUserSource(input: UserSourceInput, now = new Date().toISOString()): { ok: true; source: Source } | { ok: false; message: string } {
  const title = input.title.trim();
  const v = validateSourceUrl(input.url);
  if (!v.ok) return v;
  const host = new URL(v.url).hostname.replace(/^www\./, '');
  const source = Source.parse({
    id: `usr-${uuidv4()}`,
    kind: input.kind,
    title: (title || host).slice(0, 200),
    publisher: host,
    url: v.url,
    publishedAt: null,
    accessedAt: now,
    licenseId: null,
    sourceRecordId: null,
    sourceVersion: null,
    documentPageOrSection: input.section?.trim() ? input.section.trim().slice(0, 200) : null,
    localSnapshotPath: null,
    snapshotSha256: null,
    availability: 'notChecked',
    attribution: host,
    retrievalMethod: 'Link added by the user; not fetched or verified by Sightline',
    scope: 'installation',
  });
  return { ok: true, source };
}
