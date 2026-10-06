/** Browser preview: downloads via <a download>, Web Share API when it supports files, clipboard API. */
import type { ShareOutcome, PickedFile } from './files';
export type { ShareOutcome, ShareStatus, PickedFile } from './files';

export async function shareBytes(name: string, bytes: Uint8Array, mime: string): Promise<ShareOutcome> {
  const file = new File([bytes as BlobPart], name, { type: mime });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return { status: 'Share sheet opened', detail: 'The browser share sheet was shown. Sightline cannot see whether anything was sent.' };
    } catch (e) {
      if ((e as Error).name === 'AbortError') return { status: 'Canceled', detail: 'Share sheet was closed.' };
    }
  }
  return { status: 'Sharing unavailable', detail: 'This browser cannot share files. Use Save file instead.' };
}

export async function saveBytes(name: string, bytes: Uint8Array, mime: string): Promise<ShareOutcome> {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  // Browsers do not confirm the download; we say exactly what happened.
  return { status: 'Export saved', detail: `Download of ${name} (${bytes.length.toLocaleString()} bytes) was handed to the browser.` };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function pickFile(maxBytes: number): Promise<PickedFile> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    let done = false;
    input.onchange = async () => {
      done = true;
      const f = input.files?.[0];
      if (!f) return resolve({ status: 'canceled' });
      if (f.size > maxBytes) return resolve({ status: 'error', message: `File is ${(f.size / 1e6).toFixed(1)} MB, above the ${(maxBytes / 1e6).toFixed(0)} MB import limit.` });
      resolve({ status: 'ok', name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) });
    };
    window.addEventListener('focus', () => setTimeout(() => !done && resolve({ status: 'canceled' }), 800), { once: true });
    input.click();
  });
}
export function sweepExports(): number {
  return 0;
}
export const EXPORT_TTL_MS = 0;
export const NATIVE_SHARE = false;
