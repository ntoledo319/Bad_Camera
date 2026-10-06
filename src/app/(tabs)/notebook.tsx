/** S11 Notebook: private observations, bookmarks and collections. Search, filter, multi-select delete. */
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Plus, FileCheck2, Trash, Search, Folder } from 'lucide-react-native';
import { BatchExport } from '../../features/BatchExport';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, Chip, DemoBanner, Empty, Field, Loading, Pill, Row, Screen, Section, Segmented, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { fmtDate, observationTitle, installationTitle, placeLabelOf } from '../../features/format';
import { CategoryIcon } from '../../features/CategoryIcon';
import type { Bookmark, Collection, Observation } from '../../domain/schemas';

export default function NotebookTab() {
  const s = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const [obs, setObs] = useState<Observation[] | null>(null);
  const [bms, setBms] = useState<Bookmark[]>([]);
  const [cols, setCols] = useState<Collection[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'observations' | 'bookmarks'>('observations');
  const [col, setCol] = useState<string | null>(null);
  const [newCol, setNewCol] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const nb = s.notebook;
      const [o, b, cl] = await Promise.all([nb.listLatest(), nb.bookmarks(), nb.collections()]);
      setObs(o);
      setBms(b);
      setCols(cl);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
      setObs([]);
    }
  }, [s.notebook]);
  // Reload on focus and whenever the notebook changes (s.rev is the change signal).
  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, s.rev]),
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (obs ?? []).filter((o) => {
      if (col && !o.collectionIds.includes(col)) return false;
      if (!needle) return true;
      return [observationTitle(o), o.placeLabel, o.localNotes, o.id].join(' ').toLowerCase().includes(needle);
    });
  }, [obs, q, col]);
  const filteredBms = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return bms.filter((b) => !needle || b.label.toLowerCase().includes(needle));
  }, [bms, q]);

  if (obs === null) return <Loading label="Opening your notebook…" />;

  const toggle = (id: string) => {
    const n = new Set(sel);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSel(n);
  };
  const deleteSelected = async () => {
    const ids = [...sel];
    let ok = 0;
    for (const id of ids) {
      try {
        await s.notebook.delete(id);
        ok++;
      } catch (e) {
        setErr(`Could not delete one record: ${(e as Error).message}`);
      }
    }
    setConfirm(false);
    setSelecting(false);
    setSel(new Set());
    setToast(`${ok} record${ok === 1 ? '' : 's'} and their private media deleted from this device.`);
    s.bump();
    load();
  };
  const createCol = async () => {
    if (!newCol?.trim()) return;
    const cl = await s.notebook.createCollection(newCol);
    setNewCol(null);
    setCol(cl.id);
    load();
  };

  return (
    <Screen scroll>
      {s.settings.demoMode ? <DemoBanner /> : null}
      <T v="small" style={{ color: c.text2, marginTop: SPACE.xs }}>
        {s.settings.demoMode ? 'Demo notebook — separate from your real records.' : 'Private to this device. Nothing here is uploaded.'}
      </T>
      {err ? (
        <View style={{ marginTop: SPACE.m }}>
          <Banner kind="error" title="Something went wrong" action={<Button kind="secondary" label="Retry" onPress={load} />}>
            {err}
          </Banner>
        </View>
      ) : null}
      {toast ? (
        <View style={{ marginTop: SPACE.m }}>
          <Banner kind="info" title="Done" action={<Button kind="ghost" label="Dismiss" onPress={() => setToast(null)} />}>
            {toast}
          </Banner>
        </View>
      ) : null}

      <View style={{ marginTop: SPACE.l }}>
        <Field label="Search notebook" placeholder="Place, notes, type or record ID" value={q} onChangeText={setQ} accessibilityLabel="Search notebook" returnKeyType="search" />
      </View>
      <View style={{ marginTop: SPACE.m }}>
        <Segmented
          label="Show"
          options={[
            { key: 'observations', label: `Observations (${obs.length})` },
            { key: 'bookmarks', label: `Bookmarks (${bms.length})` },
          ]}
          value={tab}
          onChange={(k) => setTab(k as typeof tab)}
        />
      </View>

      {tab === 'observations' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s, marginTop: SPACE.m }}>
            <Chip label="All" selected={!col} onPress={() => setCol(null)} />
            {cols.map((cl) => (
              <Chip key={cl.id} label={cl.name} selected={col === cl.id} count={obs.filter((o) => o.collectionIds.includes(cl.id)).length} onPress={() => setCol(col === cl.id ? null : cl.id)} />
            ))}
            <Chip label="+ Collection" onPress={() => setNewCol('')} />
          </View>
          {newCol !== null ? (
            <Card>
              <Field label="New collection name" value={newCol} onChangeText={setNewCol} autoFocus maxLength={60} onSubmitEditing={createCol} />
              <View style={{ flexDirection: 'row', gap: SPACE.s, marginTop: SPACE.s }}>
                <Button label="Create" onPress={createCol} disabled={!newCol.trim()} style={{ flex: 1 }} />
                <Button kind="ghost" label="Cancel" onPress={() => setNewCol(null)} style={{ flex: 1 }} />
              </View>
            </Card>
          ) : null}
          {col ? (
            <View style={{ flexDirection: 'row', gap: SPACE.s, marginTop: SPACE.s }}>
              <Button kind="ghost" label="Open collection" icon={<Folder size={18} color={c.primary} />} onPress={() => router.push(`/collections/${col}`)} />
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: SPACE.s, marginTop: SPACE.m }}>
            <Button label="New observation" icon={<Plus size={20} color={c.onPrimary} />} onPress={() => router.push('/observation/new')} style={{ flex: 1 }} />
            {obs.length ? <Button kind="secondary" label={selecting ? 'Done' : 'Select'} onPress={() => (setSelecting(!selecting), setSel(new Set()))} /> : null}
          </View>

          {selecting ? (
            <Card>
              <T v="small">{sel.size} selected</T>
              <View style={{ flexDirection: 'row', gap: SPACE.s, marginTop: SPACE.s, flexWrap: 'wrap' }}>
                <Button kind="secondary" label="Select all shown" onPress={() => setSel(new Set(filtered.map((o) => o.id)))} />
                <Button kind="danger" label="Delete selected" icon={<Trash size={18} color={c.error} />} disabled={!sel.size} onPress={() => setConfirm(true)} />
              </View>
              {sel.size ? (
                <View style={{ marginTop: SPACE.m }}>
                  <BatchExport ids={[...sel]} label={`${sel.size} selected record${sel.size === 1 ? '' : 's'}`} />
                </View>
              ) : null}
              {confirm ? (
                <View style={{ marginTop: SPACE.m }}>
                  <Banner kind="error" title={`Delete ${sel.size} record${sel.size === 1 ? '' : 's'}?`}>
                    All revisions and private photos for these records are removed from this device. Files you already shared elsewhere are not affected. This cannot be undone.
                  </Banner>
                  <View style={{ flexDirection: 'row', gap: SPACE.s, marginTop: SPACE.s }}>
                    <Button label="Keep records" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
                    <Button kind="danger" label="Delete" onPress={deleteSelected} style={{ flex: 1 }} testID="confirm-bulk-delete" />
                  </View>
                </View>
              ) : null}
            </Card>
          ) : null}

          <Section title={col ? 'In this collection' : 'Observations'}>
            {filtered.length === 0 ? (
              obs.length === 0 ? (
                <Empty
                  title="No observations yet"
                  body="Record equipment you see — with or without a photo. Records stay on this device unless you export them."
                  action={<Button label="Record an observation" onPress={() => router.push('/identify')} />}
                />
              ) : (
                <Empty title="No matches" body="Try a different search or collection." action={<Button kind="secondary" label="Clear filters" onPress={() => (setQ(''), setCol(null))} />} />
              )
            ) : (
              filtered.map((o) => (
                <Row
                  key={o.id}
                  left={<CategoryIcon category={o.category} size={22} />}
                  title={observationTitle(o)}
                  subtitle={`${o.placeLabel || 'No place label'} · ${o.observedAt ? `Observed ${fmtDate(o.observedAt)}` : `Recorded ${fmtDate(o.deviceRecordedAt)}`} · ${o.attachments.length} photo${o.attachments.length === 1 ? '' : 's'}${o.revision > 1 ? ` · rev ${o.revision}` : ''}`}
                  right={selecting ? <Pill label={sel.has(o.id) ? 'Selected' : 'Select'} tone={sel.has(o.id) ? 'primary' : 'neutral'} /> : o.isDemo ? <Pill label="Demo" tone="caution" /> : undefined}
                  onPress={() => (selecting ? toggle(o.id) : router.push(`/observation/${o.id}`))}
                />
              ))
            )}
          </Section>
        </>
      ) : (
        <Section title="Bookmarked map records">
          {filteredBms.length === 0 ? (
            <Empty title={bms.length ? 'No matches' : 'No bookmarks'} body={bms.length ? 'Try a different search.' : 'Save map records from Explore to find them again quickly. Bookmarks are private.'} action={bms.length ? undefined : <Button label="Open Explore" onPress={() => router.push('/explore')} />} />
          ) : (
            filteredBms.map((b) => {
              const inst = b.installationId ? s.installation(b.installationId) : null;
              return (
                <Row
                  key={b.id}
                  left={inst ? <CategoryIcon category={inst.category} size={22} /> : <Search size={22} color={c.text2} />}
                  title={b.label}
                  subtitle={inst ? `${installationTitle(inst)} · ${placeLabelOf(inst)}` : 'Map record no longer in the current dataset'}
                  onPress={inst ? () => router.push(`/camera/${encodeURIComponent(inst.id)}`) : undefined}
                />
              );
            })
          )}
        </Section>
      )}

      <Section title="Received a package?">
        <Row left={<FileCheck2 size={22} color={c.primary} />} title="Verify an evidence ZIP" subtitle="Check checksums and the manifest locally. Nothing is uploaded." onPress={() => router.push('/verify')} />
      </Section>
    </Screen>
  );
}
