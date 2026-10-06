/** Equipment guide entry: what it is, visible cues, lookalikes, what is unknown, sources. */
import React from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, Empty, Pill, Row, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { CATALOG_BY_ID } from '../../../content/catalog/catalog';
import { SOURCE_BY_ID } from '../../../content/sources';
import { capitalize } from '../../features/format';
import { CATEGORY_LABEL } from '../../domain/projection';
import { SchematicView } from '../../features/SchematicView';

function Bullets({ items }: { items: string[] }) {
  const { c } = useTheme();
  if (!items.length) return <T v="small" style={{ color: c.text2 }}>None recorded.</T>;
  return (
    <View style={{ gap: SPACE.xs }}>
      {items.map((x) => (
        <T key={x} v="small">
          • {x}
        </T>
      ))}
    </View>
  );
}

export default function CatalogEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const router = useRouter();
  const e = CATALOG_BY_ID[String(id)];
  if (!e)
    return (
      <Screen>
        <Empty title="Guide entry not found" body="It may have been renamed in a newer content version." action={<Button label="Back to Learn" onPress={() => router.replace('/learn')} />} />
      </Screen>
    );
  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Equipment guide' }} />
      <View style={{ flexDirection: 'row', gap: SPACE.l, alignItems: 'center' }}>
        <SchematicView name={e.schematic} size={112} label={`Illustrative line drawing for ${e.familyLabel}. Not a photo of a real device.`} />
        <View style={{ flex: 1, gap: SPACE.xs }}>
          <T v="title">{e.familyLabel}</T>
          <T v="small" style={{ color: c.text2 }}>{e.manufacturer}</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
            <Pill label={CATEGORY_LABEL[e.category]} tone="primary" />
            {e.deploymentModes.map((m) => (
              <Pill key={m} label={capitalize(m.replace(/_/g, ' '))} />
            ))}
          </View>
        </View>
      </View>
      <T v="caption" style={{ color: c.text2, marginTop: SPACE.s }}>Drawing is illustrative only.</T>
      <T style={{ marginTop: SPACE.m }}>{e.summary}</T>

      <Section title="What it does (per vendor materials)">
        <Card>
          <T v="small">{e.whatItDoes}</T>
        </Card>
      </Section>
      <Section title="Names">
        <Card>
          <T v="small" style={{ fontWeight: '600' }}>Current marketing labels</T>
          <Bullets items={e.currentLabels} />
          <T v="small" style={{ fontWeight: '600', marginTop: SPACE.m }}>Older names / aliases</T>
          <Bullets items={e.legacyAliases} />
        </Card>
      </Section>
      <Section title="Visible cues">
        <Card>
          <Bullets items={e.visibleCues} />
        </Card>
      </Section>
      <Section title="Often confused with">
        <Card>
          <Bullets items={e.lookalikes} />
          <T v="small" style={{ fontWeight: '600', marginTop: SPACE.m }}>What would distinguish it</T>
          <Bullets items={e.distinguishers} />
        </Card>
      </Section>
      <Section title="Established vs. unknown">
        <Card>
          <T v="small" style={{ fontWeight: '600' }}>Established by sources</T>
          <Bullets items={e.confirmedFeatures} />
          <T v="small" style={{ fontWeight: '600', marginTop: SPACE.m }}>Not established</T>
          <Bullets items={e.unknowns.length ? e.unknowns : ['Whether any particular device is operating, what it retains, or who receives its data.']} />
        </Card>
      </Section>
      <Banner kind="info" title="Visual similarity is not identification">
        Looking like this family is not enough to say a device is one. A readable label or a site-specific public record is needed for an exact identification.
      </Banner>
      <Section title="Sources">
        {e.sourceIds.map((sid) => {
          const s = SOURCE_BY_ID[sid];
          return s ? <Row key={sid} title={s.title} subtitle={`${s.publisher} · [${sid}]`} onPress={() => router.push({ pathname: '/sources/[id]', params: { id: sid } })} right={<ChevronRight size={18} color={c.text2} />} /> : null;
        })}
      </Section>
      <View style={{ gap: SPACE.s, marginTop: SPACE.l }}>
        <Button kind="secondary" label="Compare with another family" onPress={() => router.push({ pathname: '/compare', params: { a: e.id } })} />
      </View>
    </Screen>
  );
}
