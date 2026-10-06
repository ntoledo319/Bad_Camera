/** Original line-drawing schematic (illustrative only; not an evidence photo). */
import React from 'react';
import { View } from 'react-native';
import { schematicFor } from '../domain/schematics';

export function SchematicView({ name, size = 120, label }: { name: string | null | undefined; size?: number; label: string }) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${schematicFor(name)}</svg>`;
  return (
    <View style={{ width: size, height: size }}>
      {React.createElement('img', { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`, alt: label, width: size, height: size })}
    </View>
  );
}
