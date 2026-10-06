/** S12 Record detail: original/redacted selector, timeline, revisions (append-only), genuine delete. */
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Share2, Pencil, Trash, ShieldCheck, ChevronRight, Lock } from 'lucide-react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, Chip, DemoBanner, Empty, Field, KV, Loading, Pill, Row, Screen, Section, Segmented, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { loadBundle, type RecordBundle, derivativeFor } from '../../features/exportService';
import { PhotoView } from '../../features/PhotoView';
import { CATEGORY_LABEL } from '../../domain/projection';
import { verifyChain } from '../../domain/observation';
import { fmtDate, observationTitle, installationTitle, claimDisplay } from '../../features/format';
import { SourceLinkForm, SourceLinkList } from '../../features/SourceLinks';
import { roundForDisplay } from '../../domain/distance';
import { CATALOG_BY_ID } from '../../../content/catalog/catalog';
import type { Category, Collection } from '../../domain/schemas';

const BASIS_TEXT = {
  unknown: 'Not identified',
  possible_family_visual_features: 'Visible features only',
  readable_label_or_documentation: 'Readable label or documentation',
  linked_public_record: 'Linked public record',
} as const;

const capitalizeFirst = (v: string) => v[0].toUpperCase() + v.slice(1);

const METHOD_TEXT: Record<string, string> = {
  source_map: 'from source map',
  user_placed: 'placed by you',
  photo_metadata: 'photo metadata, not verified',
  approximate_area: 'approximate area',
  gps_fix: 'phone location fix',
  manual_reference: 'placed by you',
};

export default function RecordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const [b, setB] = useState<RecordBundle | null | undefined>(undefined);
  const [exports, setExports] = useState<{ kind: string; status: string; at: string; sha256: string | null }[]>([]);
  const [cols, setCols] = useState<Collection[]>([]);
  const [view, setView] = useState<'original' | 'redacted'>('redacted');
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [place, setPlace] = useState('');
  const [category, setCategory] = useState<Category>('unknown');
  const [reason, setReason] = useState('');
  const [addingSource, setAddingSource] = useState(false);

  const load = useCallback(async () => {
    const r = await loadBundle(s, String(id));
    setB(r);
    if (r) {
      setNotes(r.observation.localNotes);
      setPlace(r.observation.placeLabel);
      setCategory(r.observation.category);
      setExports(await s.notebook.exportLog(r.observation.id));
      setCols(await s.notebook.collections());
    }
  }, [id, s]);
  // Reload on focus and whenever the notebook changes (s.rev is the change signal).
  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, s.rev]),
  );

  if (b === undefined) return <Loading label="Opening record…" />;
  if (b === null)
    return (
      <Screen>
        <Empty title="Record not found" body="It may have been deleted, or it belongs to the other notebook (demo vs. real)." action={<Button label="Go to Notebook" onPress={() => router.replace('/notebook')} />} />
      </Screen>
    );

  const o = b.observation;
  const chainBreak = verifyChain(b.revisions);
  const inst = o.installationId ? s.installation(o.installationId) : null;
  const first = b.attachments[0];

  const saveEdit = async () => {
    setErr(null);
    try {
      const patch: Parameters<typeof s.notebook.revise>[1] = {};
      if (notes !== o.localNotes) patch.localNotes = notes;
      if (place !== o.placeLabel) patch.placeLabel = place;
      if (category !== o.category) patch.category = category;
      if (!Object.keys(patch).length) return setEditing(false);
      await s.notebook.revise(o.id, patch, reason || 'Edited details');
      setEditing(false);
      setReason('');
      s.bump();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const toggleCollection = async (colId: string) => {
    const has = o.collectionIds.includes(colId);
    await s.notebook.revise(o.id, { collectionIds: has ? o.collectionIds.filter((x) => x !== colId) : [...o.collectionIds, colId] }, has ? 'Removed from collection' : 'Added to collection');
    s.bump();
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: observationTitle(o) }} />
      {o.isDemo && <DemoBanner />}
      {first ? (
        <>
          <Segmented
            label="Photo view"
            options={[
              { key: 'redacted', label: 'Public preview' },
              { key: 'original', label: 'Private original' },
            ]}
            value={view}
            onChange={setView}
          />
          {view === 'original' ? (
            <View>
              <PhotoView load={() => s.notebook.attachmentBytes(first.id)} deps={[first.id, 'o']} label="Private original photo" aspect={first.width / Math.max(1, first.height)} />
              <View style={{ position: 'absolute', top: 8, left: 8 }}>
                <Pill label="PRIVATE ORIGINAL — never exported by default" tone="caution" />
              </View>
            </View>
          ) : (
            <PhotoView load={async () => (await derivativeFor(s, first)).bytes} deps={[first.id, JSON.stringify(first.transformations), 'r']} label="Public derivative preview" aspect={first.width / Math.max(1, first.height)} />
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s, alignItems: 'center' }}>
            <Pill label={first.redactionReviewedAt ? `Reviewed ${fmtDate(first.redactionReviewedAt)}` : 'Not yet reviewed for public use'} tone={first.redactionReviewedAt ? 'primary' : 'caution'} />
            <Pill label={`${b.attachments.length} photo${b.attachments.length === 1 ? '' : 's'}`} />
          </View>
          {b.attachments.map((a, i) => (
            <Row key={a.id} title={`Photo ${i + 1}: ${a.redactionReviewedAt ? 'reviewed' : 'needs review'}`} subtitle={`${a.transformations.filter((x) => x.type === 'mask').length} masks · SHA-256 ${a.sha256.slice(0, 12)}…`} onPress={() => router.push({ pathname: '/observation/redact', params: { attachmentId: a.id, recordId: o.id } })} right={<ChevronRight size={18} color={c.text2} />} left={<ShieldCheck size={20} color={c.primary} />} />
          ))}
        </>
      ) : (
        <Card>
          <T color={c.text2}>No photo in this record. Exports will use a schematic diagram.</T>
        </Card>
      )}

      <Button label="Share / export" icon={<Share2 size={20} color={c.onPrimary} />} onPress={() => router.push({ pathname: '/share/[recordId]', params: { recordId: o.id } })} />

      <Section title="Your record">
        <Card>
          <KV k="Equipment type" v={CATEGORY_LABEL[o.category]} />
          <KV k="Identification" v={o.identificationLevel === 'unknown' ? 'Unknown' : `${o.identificationLevel === 'exact_model' ? 'Exact model' : 'Possible family'}: ${CATALOG_BY_ID[o.selectedFamilyId ?? '']?.familyLabel ?? o.selectedFamilyId}`} />
          <KV k="Basis" v={BASIS_TEXT[o.identificationBasis]} />
          <KV k="Event time" v={o.observedAt ? `${fmtDate(o.observedAt, true)} (${o.observedAtBasis === 'photo_metadata' ? 'photo metadata, not verified' : 'phone clock at capture'})` : 'Not established'} />
          <KV k="Place label" v={o.placeLabel || 'None'} />
          <KV k="Equipment location" v={o.equipmentLocation ? `${o.equipmentLocation.lat.toFixed(5)}, ${o.equipmentLocation.lon.toFixed(5)} (${METHOD_TEXT[o.equipmentLocation.method]})` : (o.equipmentLocationUncertainNote ?? 'Not recorded')} />
          <KV k="Photographer position (private)" v={o.observerLocation ? `${capitalizeFirst(METHOD_TEXT[o.observerLocation.method])}${o.observerLocation.horizontalAccuracyM != null ? ` ±${Math.round(o.observerLocation.horizontalAccuracyM)} m` : ''}` : 'Not recorded'} />
          <KV k="Distance at save" v={o.distanceSnapshot ? `About ${roundForDisplay(o.distanceSnapshot.meters, s.settings.units).text} · straight-line` : 'Not computed'} />
          <KV k="Direction" v={o.direction?.cardinal ?? 'Unknown'} />
          {inst && <Row title={`Linked record: ${installationTitle(inst)}`} subtitle="Public mapped record (source claims)" onPress={() => router.push({ pathname: '/camera/[id]', params: { id: inst.id } })} right={<ChevronRight size={18} color={c.text2} />} />}
        </Card>
      </Section>
      <Section title="Private notes">
        <Card style={{ backgroundColor: c.cautionBg, borderColor: c.cautionBg }}>
          <View style={{ flexDirection: 'row', gap: SPACE.s, alignItems: 'center' }}>
            <Lock size={16} color={c.caution} />
            <T v="caption" color={c.caution}>
              Personal notes — never in public exports
            </T>
          </View>
          <T>{o.localNotes || 'No notes.'}</T>
        </Card>
      </Section>
      {b.claims.length > 0 && (
        <Section title="Source claims (from the linked public record)">
          <Card>
            {b.claims.slice(0, 8).map((cl) => {
              const dsp = claimDisplay(cl.fieldPath, cl.value);
              return <KV key={cl.id} k={`${dsp.label} · ${cl.basis === 'sourceReported' ? 'reported by source' : cl.basis}`} v={dsp.value} />;
            })}
          </Card>
        </Section>
      )}
      <Section title="Sources you added">
        <SourceLinkList sources={o.userSources ?? []} />
        {!(o.userSources ?? []).length && !addingSource && <T v="small" color={c.text2}>None yet. Add a news report, agency document or manufacturer page you relied on.</T>}
        {addingSource ? (
          <SourceLinkForm
            onAdd={async (src) => {
              await s.notebook.revise(o.id, { userSources: [...(o.userSources ?? []), src] }, `Added source: ${src.title}`);
              setAddingSource(false);
              s.bump();
            }}
            onCancel={() => setAddingSource(false)}
          />
        ) : (
          <Button label="Add a source link" kind="secondary" onPress={() => setAddingSource(true)} />
        )}
      </Section>

      {editing ? (
        <Card>
          <T v="heading">Edit details</T>
          <T v="small" color={c.text2}>Edits are appended as a new revision. The earlier version is preserved and photos are not overwritten.</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => (
              <Chip key={k} label={CATEGORY_LABEL[k]} selected={category === k} onPress={() => setCategory(k)} />
            ))}
          </View>
          <Field label="Place label" value={place} onChangeText={setPlace} />
          <Field label="Private notes" value={notes} onChangeText={setNotes} multiline style={{ minHeight: 80 }} />
          <Field label="Reason for this change" value={reason} onChangeText={setReason} placeholder="e.g. corrected category after second visit" />
          {err && <Banner kind="error">{err}</Banner>}
          <View style={{ flexDirection: 'row', gap: SPACE.m }}>
            <Button label="Cancel" kind="secondary" onPress={() => setEditing(false)} style={{ flex: 1 }} />
            <Button label="Save revision" onPress={saveEdit} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button label="Edit details" kind="secondary" icon={<Pencil size={18} color={c.primary} />} onPress={() => setEditing(true)} />
      )}

      <Section title="Collections">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
          {cols.length === 0 && <T v="small" color={c.text2}>No collections yet — create one in Notebook.</T>}
          {cols.map((col) => (
            <Chip key={col.id} label={col.name} selected={o.collectionIds.includes(col.id)} onPress={() => toggleCollection(col.id)} />
          ))}
        </View>
      </Section>

      <Section title="Timeline">
        <Card>
          {b.attachments.map((a) => (
            <KV key={a.id} k={a.origin === 'inAppCapture' ? 'Photo captured' : 'Photo imported'} v={fmtDate(a.acquiredAt, true)} />
          ))}
          {b.revisions.map((r) => (
            <KV key={r.revision} k={r.revision === 1 ? 'Saved (revision 1)' : `Revision ${r.revision}: ${r.revisionReason ?? ''}`} v={fmtDate(r.deviceRecordedAt, true)} />
          ))}
          {exports.map((e) => (
            <KV key={e.at} k={`Export: ${e.kind} — ${e.status}`} v={fmtDate(e.at, true)} />
          ))}
          <T v="caption" color={chainBreak === -1 ? c.text2 : c.error}>
            {chainBreak === -1 ? `Local revision chain intact (${b.revisions.length} revision${b.revisions.length === 1 ? '' : 's'}). A local chain is not a trusted timestamp.` : `Revision chain mismatch at revision ${chainBreak + 1}.`}
          </T>
        </Card>
      </Section>

      {confirmDelete ? (
        <Banner
          kind="error"
          title="Delete this record?"
          action={
            <View style={{ flexDirection: 'row', gap: SPACE.s }}>
              <Button label="Keep record" kind="secondary" onPress={() => setConfirmDelete(false)} />
              <Button
                label="Delete permanently"
                kind="danger"
                onPress={async () => {
                  await s.notebook.delete(o.id);
                  s.bump();
                  router.replace('/notebook');
                }}
              />
            </View>
          }
        >
          {`All ${b.revisions.length} revision(s) and ${b.attachments.length} private photo(s) will be removed from this device.${exports.length ? ' Files you already shared or saved elsewhere, and encrypted backups you made, are not affected.' : ''}`}
        </Banner>
      ) : (
        <Button label="Delete record" kind="ghost" icon={<Trash size={18} color={c.error} />} onPress={() => setConfirmDelete(true)} />
      )}
      <T v="caption" color={c.text2}>
        Record {o.id} · revision {o.revision}
      </T>
    </Screen>
  );
}
