/** Collection detail: records in a collection; delete the collection (records are kept). */
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../../data/store';
import { Banner, Button, Empty, Loading, Row, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { CategoryIcon } from '../../features/CategoryIcon';
import { BatchExport } from '../../features/BatchExport';
import { fmtDate, observationTitle } from '../../features/format';
import type { Collection, Observation } from '../../domain/schemas';

export default function CollectionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const router = useRouter();
  const [col, setCol] = useState<Collection | null | undefined>(undefined);
  const [items, setItems] = useState<Observation[]>([]);
  const [confirm, setConfirm] = useState(false);
  const load = useCallback(async () => {
    const cols = await s.notebook.collections();
    const found = cols.find((x) => x.id === id) ?? null;
    setCol(found);
    if (found) setItems((await s.notebook.listLatest()).filter((o) => o.collectionIds.includes(found.id)));
  }, [id, s.notebook]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  if (col === undefined) return <Loading label="Opening collection…" />;
  if (col === null)
    return (
      <Screen>
        <Empty title="Collection not found" body="It may have been deleted." action={<Button label="Go to Notebook" onPress={() => router.replace('/notebook')} />} />
      </Screen>
    );
  return (
    <Screen scroll>
      <Stack.Screen options={{ title: col.name }} />
      <T v="small" style={{ marginTop: SPACE.xs }}>Created {fmtDate(col.createdAt)} · {items.length} record{items.length === 1 ? '' : 's'}</T>
      {items.length > 0 && (
        <Section title="Export this collection">
          <BatchExport ids={items.map((o) => o.id)} label={`Collection “${col.name}”`} />
        </Section>
      )}
      <Section title="Records">
        {items.length === 0 ? (
          <Empty title="Empty collection" body="Open a record and choose this collection under “Collections” to add it." />
        ) : (
          items.map((o) => <Row key={o.id} left={<CategoryIcon category={o.category} size={22} />} title={observationTitle(o)} subtitle={o.placeLabel || 'No place label'} onPress={() => router.push(`/observation/${o.id}`)} />)
        )}
      </Section>
      <View style={{ marginTop: SPACE.xl, gap: SPACE.s }}>
        {confirm ? (
          <>
            <Banner kind="caution" title="Delete this collection?">
              The records inside are kept; only the grouping is removed.
            </Banner>
            <Button label="Keep collection" onPress={() => setConfirm(false)} />
            <Button
              kind="danger"
              label="Delete collection"
              onPress={async () => {
                for (const o of items) await s.notebook.revise(o.id, { collectionIds: o.collectionIds.filter((x) => x !== col.id) }, `Removed from collection “${col.name}”`);
                await s.notebook.deleteCollection(col.id);
                s.bump();
                router.replace('/notebook');
              }}
            />
          </>
        ) : (
          <Button kind="danger" label="Delete collection…" onPress={() => setConfirm(true)} />
        )}
      </View>
    </Screen>
  );
}
