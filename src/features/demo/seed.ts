/**
 * Seeds the SEPARATE demo notebook (store "demo") with one clearly labeled demonstration record.
 * Never writes into the private notebook; never mixes with real records.
 */
import type { Notebook } from '../../data/notebook';
import { Attachment } from '../../domain/schemas';
import { demoObservationRevisions, DEMO_CREATED } from '../../domain/demo';
import { sha256Hex } from '../../domain/hash';
import { base64ToBytes } from '../exportService';
import { DEMO_PHOTO_B64 } from './demoPhoto';

export async function ensureDemoSeeded(nb: Notebook): Promise<boolean> {
  if ((await nb.listLatest()).length) return false;
  const bytes = base64ToBytes(DEMO_PHOTO_B64);
  const attachment = Attachment.parse({
    id: 'demo-attachment-1',
    relativePrivatePath: 'b_demo_photo_1',
    mime: 'image/jpeg',
    bytes: bytes.length,
    originalFilenamePrivate: 'demo-photo-with-exif.jpg',
    origin: 'inAppCapture',
    sha256: sha256Hex(bytes),
    width: 1600,
    height: 1200,
    originalMetadataPrivate: { note: 'DEMONSTRATION fixture with synthetic EXIF (DemoMake / DemoPhone 1 / demo GPS).' },
    acquiredAt: DEMO_CREATED,
    derivativeOf: null,
    transformations: [{ type: 'mask', shape: 'rect', x: 0.02, y: 0.02, w: 0.6, h: 0.06 }],
    publicDerivativePath: null,
    publicDerivativeSha256: null,
    redactionReviewedAt: '2026-09-15T09:05:00.000Z',
    receivedBytesNote: null,
  });
  await nb.seed(demoObservationRevisions(), [{ attachment, bytes }]);
  return true;
}
