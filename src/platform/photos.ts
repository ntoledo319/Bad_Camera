/**
 * Camera capture & import. Camera permission requested only on "Take a photo".
 * Import uses the system photo picker (no broad library permission on Android 13+/iOS 14+).
 * Captured photos are NOT saved to the shared photo library.
 * Bytes are copied into the private store immediately by the caller; we never keep
 * pointers to external files.
 */
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { readExif, jpegSize, type PhotoMetadata } from '../domain/exif';

export interface PickedPhoto {
  bytes: Uint8Array;
  mime: string;
  width: number;
  height: number;
  origin: 'inAppCapture' | 'import';
  originalFilenamePrivate: string | null;
  photoMetadata: PhotoMetadata;
  receivedBytesNote: string | null;
}

export type PickResult = { status: 'ok'; photos: PickedPhoto[]; failed: number } | { status: 'canceled' } | { status: 'denied'; message: string } | { status: 'error'; message: string };

async function toPicked(a: ImagePicker.ImagePickerAsset, origin: PickedPhoto['origin']): Promise<PickedPhoto> {
  let uri = a.uri;
  let mime = a.mimeType ?? 'image/jpeg';
  let note: string | null = null;
  // HEIC/PNG/WebP are converted to a JPEG working copy so the export pipeline can process them.
  if (!/jpe?g/i.test(mime)) {
    const r = await ImageManipulator.manipulateAsync(uri, [], { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG });
    uri = r.uri;
    note = `Received as ${mime}; stored as a JPEG conversion made on this device (pixel data re-encoded, original container metadata not preserved).`;
    mime = 'image/jpeg';
  }
  const bytes = await new File(uri).bytes();
  const meta = readExif(bytes);
  const size = jpegSize(bytes) ?? { width: a.width, height: a.height };
  return { bytes, mime, width: size.width, height: size.height, origin, originalFilenamePrivate: a.fileName ?? null, photoMetadata: meta, receivedBytesNote: note ?? (origin === 'import' ? 'Bytes as delivered by the system photo picker; the OS may have transcoded or stripped metadata.' : null) };
}

async function collect(res: ImagePicker.ImagePickerResult, origin: PickedPhoto['origin']): Promise<PickResult> {
  if (res.canceled || !res.assets?.length) return { status: 'canceled' };
  const photos: PickedPhoto[] = [];
  let failed = 0;
  for (const a of res.assets) {
    try {
      photos.push(await toPicked(a, origin));
    } catch {
      failed++;
    }
  }
  if (!photos.length) return { status: 'error', message: 'The selected image could not be read. Nothing was saved.' };
  return { status: 'ok', photos, failed };
}

export async function takePhoto(): Promise<PickResult> {
  try {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (p.status !== 'granted') return { status: 'denied', message: 'Camera access was not granted. You can import an existing photo instead.' };
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.92, exif: false, allowsEditing: false });
    return collect(res, 'inAppCapture');
  } catch (e) {
    return { status: 'error', message: (e as Error).message };
  }
}

export async function importPhotos(limit: number): Promise<PickResult> {
  try {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: Math.max(1, limit), quality: 1, exif: false, preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current });
    return collect(res, 'import');
  } catch (e) {
    return { status: 'error', message: (e as Error).message };
  }
}

export const CAMERA_SUPPORTED = true;
