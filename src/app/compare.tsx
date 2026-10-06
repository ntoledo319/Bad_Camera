/** Side-by-side comparison of two guide entries (visible cues, distinguishers, deployment). */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../design/theme';
import { Card, Chip, Screen, Section, T } from '../design/ui';
import { SPACE } from '../design/tokens';
import { CATALOG, CATALOG_BY_ID } from '../../content/catalog/catalog';
import { CATEGORY_LABEL } from '../domain/projection';
import { SchematicView } from '../features/SchematicView';
import { capitalize } from '../features/format';
import type { CatalogEntry } from '../domain/schemas';

function Picker({ value, onChange, label }: { value: string; onChange: (id: string) => void; label: string }) {
  return (
    <View style={{ gap: SPACE.xs }}>
      <T v="small" style={{ fontWeight: '600' }}>{label}</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.s }}>
        {CATALOG.map((e) => (
          <Chip key={e.id} label={e.familyLabel} selected={value === e.id} onPress={() => onChange(e.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

function Col({ e }: { e: CatalogEntry }) {
  const { c } = useTheme();
  const block = (title: string, items: string[]) => (
    <View style={{ marginTop: SPACE.m }}>
      <T v="caption" style={{ color: c.text2 }}>{title}</T>
      {items.length ? items.map((x) => <T key={x} v="small">• {x}</T>) : <T v="small" style={{ color: c.text2 }}>—</T>}
    </View>
  );
  return (
    <Card>
      <SchematicView name={e.schematic} size={80} label={`Illustrative drawing for ${e.familyLabel}`} />
      <T v="heading" style={{ marginTop: SPACE.s }}>{e.familyLabel}</T>
      <T v="small" style={{ color: c.text2 }}>{CATEGORY_LABEL[e.category]}</T>
      {block('Deployment', e.deploymentModes.map((m) => capitalize(m.replace(/_/g, ' '))))}
      {block('Visible cues', e.visibleCues)}
      {block('Distinguished by', e.distinguishers)}
      {block('Older names', e.legacyAliases)}
    </Card>
  );
}

export default function Compare() {
  const params = useLocalSearchParams<{ a?: string; b?: string }>();
  const [a, setA] = useState(params.a && CATALOG_BY_ID[params.a] ? params.a : 'flock-lpr');
  const [b, setB] = useState(params.b && CATALOG_BY_ID[params.b] ? params.b : 'motorola-vigilant');
  const { c } = useTheme();
  return (
    <Screen scroll>
      <T v="title">Compare families</T>
      <T v="small" style={{ color: c.text2, marginTop: SPACE.xs }}>Many devices look alike. Use differences you can actually see or document.</T>
      <View style={{ gap: SPACE.m, marginTop: SPACE.l }}>
        <Picker label="First" value={a} onChange={setA} />
        <Picker label="Second" value={b} onChange={setB} />
      </View>
      <Section title="Side by side">
        <View style={{ flexDirection: 'row', gap: SPACE.s, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Col e={CATALOG_BY_ID[a]} />
          </View>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Col e={CATALOG_BY_ID[b]} />
          </View>
        </View>
      </Section>
    </Screen>
  );
}
