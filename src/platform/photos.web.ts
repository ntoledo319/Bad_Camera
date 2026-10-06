/** Browser preview: <input type=file accept=image/jpeg>. Camera capture uses `capture` where supported. */
import { readExif, jpegSize } from '../domain/exif';
import type { PickResult, PickedPhoto } from './photos';
export type { PickResult, PickedPhoto } from './photos';

function pick(capture: boolean, limit: number): Promise<PickResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg';
    input.multiple = !capture && limit > 1;
    if (capture) input.setAttribute('capture', 'environment');
    let done = false;
    input.onchange = async () => {
      done = true;
      const files = [...(input.files ?? [])].slice(0, limit);
      if (!files.length) return resolve({ status: 'canceled' });
      const photos: PickedPhoto[] = [];
      let failed = 0;
      for (const f of files) {
        try {
          const bytes = new Uint8Array(await f.arrayBuffer());
          const size = jpegSize(bytes);
          if (!size) throw new Error('not a JPEG');
          photos.push({ bytes, mime: 'image/jpeg', width: size.width, height: size.height, origin: capture ? 'inAppCapture' : 'import', originalFilenamePrivate: f.name, photoMetadata: readExif(bytes), receivedBytesNote: 'Browser preview: bytes as provided by the browser file picker.' });
        } catch {
          failed++;
        }
      }
      resolve(photos.length ? { status: 'ok', photos, failed } : { status: 'error', message: 'The browser preview accepts JPEG images only. Nothing was saved.' });
    };
    // Detect cancel: focus returns without a change event.
    window.addEventListener('focus', () => setTimeout(() => !done && resolve({ status: 'canceled' }), 800), { once: true });
    input.click();
  });
}

export const takePhoto = () => pick(true, 1);
export const importPhotos = (limit: number) => pick(false, limit);
export const CAMERA_SUPPORTED = false;
