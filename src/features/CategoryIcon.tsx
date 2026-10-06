/** Category glyph: shape + letter + colour (never colour alone). */
import React from 'react';
import { View } from 'react-native';
import { ScanLine, Video, Gauge, AudioLines, CircleQuestionMark } from 'lucide-react-native';
import type { Category } from '../domain/schemas';
import { useTheme } from '../design/theme';

export function categoryColor(c: Category, p: ReturnType<typeof useTheme>['c']) {
  return { alpr: p.mapPinAlpr, video: p.mapPinVideo, enforcement: p.mapPinEnforcement, acoustic: p.mapPinAcoustic, unknown: p.mapPinUnknown }[c];
}

export function CategoryIcon({ category, size = 40 }: { category: Category; size?: number }) {
  const { c } = useTheme();
  const color = categoryColor(category, c);
  const Icon = { alpr: ScanLine, video: Video, enforcement: Gauge, acoustic: AudioLines, unknown: CircleQuestionMark }[category];
  return (
    <View
      aria-hidden
      style={{ width: size, height: size, borderRadius: category === 'acoustic' ? 8 : size / 2, borderWidth: 2, borderColor: color, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surface }}
    >
      <Icon size={size * 0.5} color={color} strokeWidth={2} />
    </View>
  );
}
