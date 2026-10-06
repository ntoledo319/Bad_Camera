/** S04 Filters. Unknown facts are never filtered as if false (e.g. unknown manufacturer is not "not Flock"). */
import React, { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FilterState, Category } from '../../domain/schemas';
import { CATEGORY_LABEL } from '../../domain/projection';
import { MANUFACTURER_LABEL } from '../../../content/catalog/catalog';
import { useTheme } from '../../design/theme';
import { Button, Chip, Section, T, Toggle } from '../../design/ui';
import { SPACE } from '../../design/tokens';

const AGES: { label: string; v: number | null }[] = [
  { label: 'Any time', v: null },
  { label: '30 days', v: 30 },
  { label: '90 days', v: 90 },
  { label: '1 year', v: 365 },
];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export function FiltersSheet({ visible, value, manufacturersPresent, onClose, onApply }: { visible: boolean; value: FilterState; manufacturersPresent: string[]; onClose: () => void; onApply: (f: FilterState) => void }) {
  const { c, gutter } = useTheme();
  const insets = useSafeAreaInsets();
  const [f, setF] = useState<FilterState>(value);
  React.useEffect(() => {
    if (visible) setF(value);
  }, [visible, value]);
  const reset: FilterState = { categories: [], manufacturers: [], deployment: [], sourceStatus: [], maxObservationAgeDays: null, includeRemoved: false };
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: c.scrim, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.canvas, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', paddingBottom: insets.bottom + SPACE.l }}>
          <ScrollView contentContainerStyle={{ padding: gutter, gap: SPACE.l }}>
            <T v="title">Filters</T>
            <Section title="Equipment type">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
                {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => (
                  <Chip key={k} label={CATEGORY_LABEL[k]} selected={f.categories.includes(k)} onPress={() => setF({ ...f, categories: toggle(f.categories, k) })} />
                ))}
              </View>
            </Section>
            <Section title="Manufacturer reported by source">
              <T v="small" color={c.text2}>
                Records without a reported manufacturer are hidden only while a manufacturer is selected; they are not assumed to be any brand.
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
                {manufacturersPresent.length === 0 && <T v="small" color={c.text2}>No manufacturers reported in this data.</T>}
                {manufacturersPresent.map((m) => (
                  <Chip key={m} label={MANUFACTURER_LABEL[m] ?? m} selected={f.manufacturers.includes(m)} onPress={() => setF({ ...f, manufacturers: toggle(f.manufacturers, m) })} />
                ))}
              </View>
            </Section>
            <Section title="Deployment">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
                {(
                  [
                    ['fixed', 'Fixed'],
                    ['relocatable', 'Relocatable'],
                    ['historical_mobile', 'Historical mobile'],
                  ] as const
                ).map(([k, l]) => (
                  <Chip key={k} label={l} selected={f.deployment.includes(k)} onPress={() => setF({ ...f, deployment: toggle(f.deployment, k) })} />
                ))}
              </View>
            </Section>
            <Section title="Source status">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
                {(
                  [
                    ['source_backed', 'Source-backed'],
                    ['community_reported', 'Community-reported'],
                    ['disputed', 'Disputed'],
                  ] as const
                ).map(([k, l]) => (
                  <Chip key={k} label={l} selected={f.sourceStatus.includes(k)} onPress={() => setF({ ...f, sourceStatus: toggle(f.sourceStatus, k) })} />
                ))}
              </View>
            </Section>
            <Section title="Recently observed">
              <T v="small" color={c.text2}>
                “Recently observed” uses published in-person check dates only. Records that only have a map-edit timestamp are excluded when a range is set.
              </T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
                {AGES.map((a) => (
                  <Chip key={a.label} label={a.label} selected={f.maxObservationAgeDays === a.v} onPress={() => setF({ ...f, maxObservationAgeDays: a.v })} />
                ))}
              </View>
            </Section>
            <Toggle label="Include removed records" hint="Records reported or documented as removed. Off by default." value={f.includeRemoved} onChange={(v) => setF({ ...f, includeRemoved: v })} />
            <View style={{ flexDirection: 'row', gap: SPACE.m }}>
              <Button label="Reset" kind="secondary" style={{ flex: 1 }} onPress={() => setF(reset)} />
              <Button label="Show results" style={{ flex: 1 }} onPress={() => onApply(f)} />
            </View>
            <Button label="Close" kind="ghost" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
