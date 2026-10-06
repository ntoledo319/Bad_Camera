/** Native card preview: the exact card SVG, rendered by react-native-svg inside a capturable view. */
import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

export const CardPreview = forwardRef<View, { svg: string; width: number; height: number; displayWidth: number; label: string }>(function CardPreview({ svg, width, height, displayWidth, label }, ref) {
  const dh = (displayWidth * height) / width;
  return (
    <View ref={ref} collapsable={false} accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: displayWidth, height: dh, backgroundColor: '#fff' }}>
      <SvgXml xml={svg} width={displayWidth} height={dh} />
    </View>
  );
});
