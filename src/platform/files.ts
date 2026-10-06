/**
 * Outbound sharing and file import/export (native).
 *
 * Honest statuses (spec §12): expo-sharing resolves when the sheet is dismissed but does
 * not report which target (if any) was chosen. We therefore report "Share sheet opened",
 * never "Posted"/"Shared". "Export saved" is only reported after a confirmed file write to
 * a user-chosen folder. "Canceled" is reported when the user backs out of a picker.
 *
 * Temporary public export files live in <cache>/sightline-exports/ and are swept on next
 * launch if older than EXPORT_TTL_MS (never while a share sheet is open in this session).
 */
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { Directory, File, Paths } from 'expo-file-system';

export type ShareStatus = 'Share sheet opened' | 'Export saved' | 'Sharing unavailable' | 'Canceled';
export interface ShareOutcome {
  status: ShareStatus;
  detail: string;
}

export const EXPORT_TTL_MS = 24 * 3600 * 1000;
const exportDir = () => new Directory(Paths.cache, 'sightline-exports');

function writeTemp(name: string, bytes: Uint8Array): File {
  const d = exportDir();
  if (!d.exists) d.create({ intermediates: true });
  const f = new File(d, name.replace(/[^A-Za-z0-9._-]/g, '_'));
  if (f.exists) f.delete();
  f.create();
  f.write(bytes);
  return f;
}

export async function shareBytes(name: string, bytes: Uint8Array, mime: string, dialogTitle: string): Promise<ShareOutcome> {
  if (!(await Sharing.isAvailableAsync())) return { status: 'Sharing unavailable', detail: 'This device has no share sheet available. Use Save file instead.' };
  const f = writeTemp(name, bytes);
  const UTI = mime === 'application/pdf' ? 'com.adobe.pdf' : mime === 'application/zip' ? 'public.zip-archive' : mime === 'image/png' ? 'public.png' : mime.startsWith('text/') ? 'public.plain-text' : undefined;
  await Sharing.shareAsync(f.uri, { mimeType: mime, dialogTitle, UTI });
  return { status: 'Share sheet opened', detail: 'The system share sheet was shown. Sightline cannot see whether anything was sent or posted.' };
}

export async function saveBytes(name: string, bytes: Uint8Array, mime: string): Promise<ShareOutcome> {
  try {
    const dir = await Directory.pickDirectoryAsync();
    if (!dir) return { status: 'Canceled', detail: 'No folder chosen. Nothing was saved.' };
    const f = dir.createFile(name, mime);
    f.write(bytes);
    if (!f.exists || (f.size ?? 0) !== bytes.length) throw new Error('written size could not be confirmed');
    return { status: 'Export saved', detail: `Saved ${name} (${bytes.length.toLocaleString()} bytes) to the folder you chose.` };
  } catch (e) {
    const msg = (e as Error).message ?? '';
    if (/cancel/i.test(msg)) return { status: 'Canceled', detail: 'No folder chosen. Nothing was saved.' };
    // iOS has no folder picker in all versions: fall back to the share sheet, which includes "Save to Files".
    if (await Sharing.isAvailableAsync()) return shareBytes(name, bytes, mime, 'Save to Files');
    return { status: 'Sharing unavailable', detail: `Could not save: ${msg}` };
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

export type PickedFile = { status: 'ok'; name: string; bytes: Uint8Array } | { status: 'canceled' } | { status: 'error'; message: string };

/** Import a user-chosen file (evidence ZIP to verify, or encrypted backup). Size-checked before reading. */
export async function pickFile(maxBytes: number): Promise<PickedFile> {
  try {
    const r = await File.pickFileAsync();
    if (r.canceled || !r.result) return { status: 'canceled' };
    const f = r.result;
    const size = f.size ?? 0;
    if (size > maxBytes) return { status: 'error', message: `File is ${(size / 1e6).toFixed(1)} MB, above the ${(maxBytes / 1e6).toFixed(0)} MB import limit.` };
    return { status: 'ok', name: f.name, bytes: await f.bytes() };
  } catch (e) {
    const msg = (e as Error).message ?? '';
    if (/cancel/i.test(msg)) return { status: 'canceled' };
    return { status: 'error', message: msg };
  }
}

/** Sweep temporary export files older than the TTL (called on launch). */
export function sweepExports(now = Date.now()): number {
  const d = exportDir();
  if (!d.exists) return 0;
  let n = 0;
  for (const e of d.list()) {
    if (e instanceof File) {
      const mt = e.info().modificationTime;
      if (mt == null || now - mt > EXPORT_TTL_MS) {
        try {
          e.delete();
          n++;
        } catch {}
      }
    }
  }
  return n;
}

export const NATIVE_SHARE = true;
