/** Browser preview: the exact card SVG shown as an image. Rasterized separately via canvas. */
import React, { forwardRef } from 'react';
import { View } from 'react-native';

export const CardPreview = forwardRef<View, { svg: string; width: number; height: number; displayWidth: number; label: string }>(function CardPreview({ svg, width, height, displayWidth, label }, ref) {
  const dh = (displayWidth * height) / width;
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return (
    <View ref={ref} style={{ width: displayWidth, height: dh, backgroundColor: '#fff' }}>
      {React.createElement('img', { src, alt: label, width: displayWidth, height: dh, style: { display: 'block', width: displayWidth, height: dh } })}
    </View>
  );
});
