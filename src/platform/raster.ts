/**
 * Card rasterization (native): the share-studio preview renders the deterministic card SVG
 * with react-native-svg; we capture that exact view at the preset's pixel size.
 * The PNG is produced from the same SVG source as the samples rendered by tools/samples.
 */
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';
import { base64ToBytes } from '../features/exportService';

export async function rasterize(_svg: string, width: number, height: number, viewRef: RefObject<unknown>): Promise<Uint8Array> {
  const b64 = await captureRef(viewRef, { format: 'png', result: 'base64', width, height });
  return base64ToBytes(b64);
}
