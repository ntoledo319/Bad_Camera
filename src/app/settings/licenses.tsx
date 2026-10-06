/** Licenses & attribution (ODbL for OSM data, basemap, open-source libraries). */
import React from 'react';
import { useTheme } from '../../design/theme';
import { Card, KV, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';

const LIBS: [string, string][] = [
  ['Expo / React Native / expo-router', 'MIT'],
  ['React', 'MIT'],
  ['MapLibre Native / MapLibre GL JS', 'BSD-2-Clause / BSD-3-Clause'],
  ['react-native-svg', 'MIT'],
  ['react-native-view-shot', 'MIT'],
  ['lucide-react-native (icons)', 'ISC'],
  ['zod', 'MIT'],
  ['fflate', 'MIT'],
  ['@noble/hashes, @noble/ciphers', 'MIT'],
  ['pdf-lib', 'MIT'],
  ['jpeg-js', 'BSD-3-Clause'],
  ['canonicalize (RFC 8785)', 'Apache-2.0'],
];

export default function Licenses() {
  const { c } = useTheme();
  return (
    <Screen scroll>
      <T v="title">Licenses & attribution</T>
      <Section title="Map data">
        <Card>
          <T v="small">Camera locations: © OpenStreetMap contributors, available under the Open Database License (ODbL) 1.0. openstreetmap.org/copyright</T>
          <T v="small" style={{ marginTop: SPACE.s }}>If you publish a database derived from this data, ODbL share-alike terms apply. Cards and reports include attribution automatically.</T>
        </Card>
      </Section>
      <Section title="Basemap">
        <Card>
          <T v="small">Map tiles: OpenFreeMap (openfreemap.org), built from OpenMapTiles schema data © OpenMapTiles, © OpenStreetMap contributors.</T>
        </Card>
      </Section>
      <Section title="Content">
        <Card>
          <T v="small">Equipment schematics are original line drawings made for Sightline. Product names are trademarks of their owners and used only to identify products; no affiliation or endorsement is implied.</T>
        </Card>
      </Section>
      <Section title="Open-source software">
        <Card>
          {LIBS.map(([n, l]) => (
            <KV key={n} k={n} v={l} />
          ))}
        </Card>
      </Section>
      <T v="caption" style={{ color: c.text2, marginTop: SPACE.l }}>Full license texts are in the source repository (LICENSES.md).</T>
    </Screen>
  );
}
