/** Original line-drawing schematic (illustrative only; not an evidence photo). */
import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { schematicFor } from '../domain/schematics';

export function SchematicView({ name, size = 120, label }: { name: string | null | undefined; size?: number; label: string }) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${schematicFor(name)}</svg>`;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size }}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}
