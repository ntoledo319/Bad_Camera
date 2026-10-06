/** Card rasterization (browser preview): draw the card SVG into a canvas at the preset's pixel size. */
import type { RefObject } from 'react';

export function rasterize(svg: string, width: number, height: number, _viewRef?: RefObject<unknown>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const ctx = c.getContext('2d');
      if (!ctx) return reject(new Error('Canvas unavailable'));
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      c.toBlob(async (b) => (b ? resolve(new Uint8Array(await b.arrayBuffer())) : reject(new Error('PNG encoding failed'))), 'image/png');
    };
    img.onerror = () => reject(new Error('Card SVG could not be rendered'));
    img.src = url;
  });
}
