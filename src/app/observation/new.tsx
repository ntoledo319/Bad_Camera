/** S07–S10: capture/import → guided features → place & distance → review & transactional save. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, ImagePlus, LocateFixed, MapPin, Trash, Check, ChevronRight } from 'lucide-react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, Chip, DemoBanner, Field, KV, Loading, Pill, Row, Screen, Section, Segmented, T } from '../../design/ui';
import { SPACE, RADIUS } from '../../design/tokens';
import { emptyDraft, MAX_PHOTOS, observedTime, exifToIso, distanceSnapshot, toObservationDraft, type Draft } from '../../features/observation/draft';
import { takePhoto, importPhotos, CAMERA_SUPPORTED, type PickResult } from '../../platform/photos';
import { requestFix } from '../../platform/location';
import { PhotoView } from '../../features/PhotoView';
import { CameraMap } from '../../features/explore/CameraMap';
import { candidatesFor } from '../../domain/identify';
import { CATALOG } from '../../../content/catalog/catalog';
import { CATEGORY_LABEL } from '../../domain/projection';
import { roundForDisplay } from '../../domain/distance';
import { NotebookError } from '../../data/notebook';
import { installationTitle, placeLabelOf, fmtDate } from '../../features/format';
import type { Category, ObservationFeatures } from '../../domain/schemas';
import { log } from '../../platform/diagnostics';
import { SourceLinkForm, SourceLinkList } from '../../features/SourceLinks';

const STEPS = ['Photo', 'Features', 'Place', 'Review'] as const;
const MOUNTS: ObservationFeatures['mounting'][] = ['pole', 'streetlight', 'building', 'gantry', 'trailer', 'vehicle', 'other', 'unknown'];
const FORMS: ObservationFeatures['form'][] = ['box', 'bullet', 'dome', 'multi_lens', 'sensor', 'unknown'];
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const label = (s: string) => (s === 'unknown' ? 'Unknown / skip' : s === 'multi_lens' ? 'Multi-lens' : s[0].toUpperCase() + s.slice(1));

function StepNav({ step, onBack, next, nextLabel = 'Next', nextDisabled, busy, nextKind = 'primary' }: { step: number; onBack: () => void; next?: () => void; nextLabel?: string; nextDisabled?: boolean; busy: boolean; nextKind?: 'primary' | 'secondary' }) {
  return (
    <View style={{ flexDirection: 'row', gap: SPACE.m }}>
      {step > 0 && <Button label="Back" kind="secondary" onPress={onBack} style={{ flex: 1 }} />}
      {next && <Button label={nextLabel} kind={nextKind} onPress={next} disabled={nextDisabled} busy={busy} style={{ flex: 2 }} />}
    </View>
  );
}

export default function NewObservation() {
  const params = useLocalSearchParams<{ installationId?: string; mode?: string; start?: string }>();
  const s = useStore();
  const { c, dark } = useTheme();
  const router = useRouter();
  const nb = s.notebook;
  const [d, setD] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ kind: 'info' | 'caution' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [placing, setPlacing] = useState<'equipment' | 'observer' | null>(null);
  const [saved, setSaved] = useState<{ id: string; atts: number } | null>(null);
  const [resumed, setResumed] = useState(false);
  const [addingSource, setAddingSource] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const scroller = useRef<ScrollView>(null);

  const freshDraft = (): Draft => {
    const fresh = emptyDraft();
    const inst = params.installationId ? s.installation(String(params.installationId)) : null;
    if (inst) {
      fresh.installationId = inst.id;
      fresh.category = inst.category;
      fresh.categoryReason = 'Linked to an existing mapped record';
      if (inst.geometry) {
        fresh.equipment = { lat: inst.geometry.lat, lon: inst.geometry.lon, uncertaintyM: inst.geometry.precisionMeters, method: 'source_map' };
        fresh.equipmentMode = 'linked';
      }
      fresh.placeLabel = placeLabelOf(inst);
    }
    if (params.mode === 'nophoto' || params.mode === 'correction') fresh.step = 1;
    return fresh;
  };

  // Load (or resume) the persisted draft.
  useEffect(() => {
    (async () => {
      const existing = await nb.draft<Draft>();
      if (existing && existing.v === 1) {
        setD(existing);
        setResumed(true);
        setMsg({ kind: 'info', text: `Resumed your unfinished draft from ${fmtDate(existing.startedAt, true)}.` });
        return;
      }
      setD(freshDraft());
      if (params.mode === 'correction') setMsg({ kind: 'info', text: 'Record what you saw that differs from the public record, and attach any sources on the Review step. The public record itself is not changed; your correction stays private.' });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nb]);

  // Persist on every change (debounced) so an interruption never loses work.
  useEffect(() => {
    if (!d || saved) return;
    const t = setTimeout(() => nb.saveDraft(d).catch((e) => log('warn', 'draft', (e as Error).message)), 300);
    return () => clearTimeout(t);
  }, [d, nb, saved]);

  const candidates = useMemo(() => (d ? candidatesFor({ ...d.features }, CATALOG, d.category === 'unknown' ? null : d.category) : []), [d]);

  // Identify tab shortcut: open the camera / picker once when a fresh draft has no photos.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!d || autoStarted.current || !params.start || d.photos.length > 0 || d.step !== 0) return;
    autoStarted.current = true;
    // addPhotos is declared below the early return; it is initialised whenever this effect sees a draft.
    // eslint-disable-next-line react-hooks/immutability
    (async () => addPhotos(params.start === 'camera' && CAMERA_SUPPORTED ? await takePhoto() : await importPhotos(MAX_PHOTOS)))();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  if (!d) return <Loading label="Opening draft…" />;
  const up = (patch: Partial<Draft>) => setD({ ...d, ...patch });
  const go = (step: Draft['step']) => {
    up({ step });
    setMsg(null);
    scroller.current?.scrollTo({ y: 0, animated: false });
  };
  const linked = d.installationId ? s.installation(d.installationId) : null;
  // Bring the map into view so the "tap the map" instruction is actionable.
  const startPlacing = (what: 'equipment' | 'observer') => {
    setPlacing(what);
    scroller.current?.scrollTo({ y: 0, animated: true });
  };

  const addPhotos = async (r: PickResult) => {
    if (r.status === 'canceled') return setMsg({ kind: 'info', text: 'No photo added.' });
    if (r.status === 'denied') return setMsg({ kind: 'caution', text: r.message });
    if (r.status === 'error') return setMsg({ kind: 'error', text: r.message });
    const room = MAX_PHOTOS - d.photos.length;
    const now = new Date().toISOString();
    const added = [];
    for (const p of r.photos.slice(0, room)) {
      const blobId = await nb.putDraftPhoto(p.bytes);
      added.push({ blobId, mime: p.mime, width: p.width, height: p.height, origin: p.origin, originalFilenamePrivate: p.originalFilenamePrivate, photoMetadata: p.photoMetadata, receivedBytesNote: p.receivedBytesNote, capturedAt: now });
    }
    const first = added[0];
    const patch: Partial<Draft> = { photos: [...d.photos, ...added] };
    if (first && d.photos.length === 0) {
      patch.timeChoice = first.origin === 'inAppCapture' ? 'capture' : exifToIso(first.photoMetadata) ? 'photo_metadata' : 'unknown';
    }
    setD({ ...d, ...patch });
    const extra = r.photos.length > room ? ` Only ${MAX_PHOTOS} photos per observation; ${r.photos.length - room} not added.` : '';
    setMsg({ kind: r.failed || extra ? 'caution' : 'info', text: `${added.length} photo${added.length === 1 ? '' : 's'} copied into your private notebook draft.${r.failed ? ` ${r.failed} could not be read.` : ''}${extra}` });
  };

  const removePhoto = async (i: number) => {
    const p = d.photos[i];
    await nb.dropDraftPhotos([p.blobId]);
    up({ photos: d.photos.filter((_, j) => j !== i) });
  };

  const useMyLocationAsObserver = async () => {
    setBusy(true);
    const r = await requestFix();
    setBusy(false);
    if (!r.ok) return setMsg({ kind: 'caution', text: `${r.message} You can place your position on the map instead, or leave it out.` });
    up({ observer: { lat: r.ref.lat, lon: r.ref.lon, horizontalAccuracyM: r.ref.accuracyM, fixTimestamp: r.ref.timestamp, method: 'gps_fix' } });
    setMsg({ kind: 'info', text: 'Your position (photographer) was recorded. It is NOT used as the equipment location.' });
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const now = new Date().toISOString();
      const inst = linked;
      const srcIds = inst ? [...new Set([...(inst.geometry?.sourceId ? [inst.geometry.sourceId] : []), ...s.claimsFor(inst.id).map((x) => x.sourceId)])] : [];
      const claimIds = inst ? s.claimsFor(inst.id).map((x) => x.id) : [];
      const snapshot = inst ? { installationId: inst.id, externalIds: inst.externalIds, sourceModifiedAt: inst.sourceModifiedAt, fetchedAt: inst.fetchedAt, category: inst.category, manufacturerId: inst.manufacturerId } : null;
      const atts = [];
      for (const p of d.photos) {
        const bytes = await nb.draftPhoto(p.blobId);
        if (!bytes) throw new NotebookError('write_failed', 'A draft photo could not be read back. Your draft is kept.');
        atts.push({ bytes, mime: p.mime, width: p.width, height: p.height, origin: p.origin, originalFilenamePrivate: p.originalFilenamePrivate, originalMetadataPrivate: { ...p.photoMetadata, receivedAt: p.capturedAt }, receivedBytesNote: p.receivedBytesNote });
      }
      const res = await nb.saveNew(toObservationDraft(d, srcIds, claimIds, snapshot, s.settings.demoMode, now), atts, now);
      await nb.dropDraftPhotos(d.photos.map((p) => p.blobId));
      setSaved({ id: res.observation.id, atts: res.attachments.length });
      s.bump();
    } catch (e) {
      const m = e instanceof NotebookError ? e.message : `Save failed: ${(e as Error).message}. Your draft is kept.`;
      setMsg({ kind: 'error', text: m });
      log('error', 'observation.save', m);
    } finally {
      setBusy(false);
    }
  };

  if (saved)
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Saved' }} />
        <Banner kind="info" title="Observation saved privately">
          {`Saved to this device as record ${saved.id} (revision 1) with ${saved.atts} photo${saved.atts === 1 ? '' : 's'}. Nothing was shared.`}
        </Banner>
        <Button label="Open record" onPress={() => router.replace({ pathname: '/observation/[id]', params: { id: saved.id } })} />
        <Button label="Share or export…" kind="secondary" onPress={() => router.replace({ pathname: '/share/[recordId]', params: { recordId: saved.id } })} />
        <Button label="Done" kind="ghost" onPress={() => router.back()} />
      </Screen>
    );

  const Stepper = (
    <View accessibilityRole="progressbar" accessibilityLabel={`Step ${d.step + 1} of 4: ${STEPS[d.step]}`} style={{ flexDirection: 'row', gap: SPACE.xs }}>
      {STEPS.map((st, i) => (
        <View key={st} style={{ flex: 1, gap: 4 }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: i <= d.step ? c.primary : c.border }} />
          <T v="caption" color={i === d.step ? c.text : c.text2} style={{ fontWeight: i === d.step ? '700' : '500' }}>
            {`${i + 1} ${st}`}
          </T>
        </View>
      ))}
    </View>
  );


  const discard = async (startNew: boolean) => {
    await nb.dropDraftPhotos(d.photos.map((p) => p.blobId));
    await nb.clearDraft();
    setConfirmDiscard(false);
    if (!startNew) return router.back();
    setResumed(false);
    setMsg(null);
    setD(freshDraft());
  };

  return (
    <ScrollView ref={scroller} style={{ flex: 1, backgroundColor: c.canvas }} contentContainerStyle={{ padding: SPACE.l, gap: SPACE.l, paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: `New observation · ${STEPS[d.step]}` }} />
      {s.settings.demoMode && <DemoBanner />}
      {Stepper}
      {msg && (
        <Banner
          kind={msg.kind}
          action={
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
              {resumed && <Button kind="ghost" label="Start a new draft instead" onPress={() => setConfirmDiscard(true)} />}
              <Button kind="ghost" label="Dismiss" onPress={() => setMsg(null)} />
            </View>
          }
        >
          {msg.text}
        </Banner>
      )}

      {d.step === 0 && (
        <>
          <T v="title">Add photos</T>
          <T color={c.text2}>Capture the whole mounting context, then an optional closer view — from a lawful public position. Don’t approach, climb, touch the equipment, or enter private property. Still photos only; no audio.</T>
          <View style={{ gap: SPACE.m }}>
            {CAMERA_SUPPORTED && <Button label="Take a photo" icon={<Camera size={20} color={c.onPrimary} />} onPress={async () => addPhotos(await takePhoto())} disabled={d.photos.length >= MAX_PHOTOS} />}
            <Button label="Import a photo" kind={CAMERA_SUPPORTED ? 'secondary' : 'primary'} icon={<ImagePlus size={20} color={CAMERA_SUPPORTED ? c.primary : c.onPrimary} />} onPress={async () => addPhotos(await importPhotos(MAX_PHOTOS - d.photos.length))} disabled={d.photos.length >= MAX_PHOTOS} />
            {!CAMERA_SUPPORTED && <T v="small" color={c.text2}>The browser preview can import JPEG files; in-app camera capture is available in the native app.</T>}
          </View>
          <T v="small" color={c.text2}>{`${d.photos.length} of ${MAX_PHOTOS} photos`}</T>
          {d.photos.map((p, i) => (
            <Card key={p.blobId}>
              <PhotoView load={() => nb.draftPhoto(p.blobId)} deps={[p.blobId]} label={`Draft photo ${i + 1}`} aspect={p.width && p.height ? p.width / p.height : 4 / 3} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
                <Pill label={p.origin === 'inAppCapture' ? 'Captured in Sightline' : 'Imported'} tone="primary" />
                <Pill label="Private original" />
              </View>
              {p.photoMetadata.dateTimeOriginal && <KV k="Photo metadata time (not verified)" v={p.photoMetadata.dateTimeOriginal.replace('T', ' ')} />}
              {p.photoMetadata.gps && <KV k="Photo metadata location (not verified)" v={`${p.photoMetadata.gps.lat.toFixed(5)}, ${p.photoMetadata.gps.lon.toFixed(5)}`} />}
              {p.receivedBytesNote && <T v="caption" color={c.text2}>{p.receivedBytesNote}</T>}
              <Button label="Remove photo" kind="ghost" icon={<Trash size={18} color={c.primary} />} onPress={() => removePhoto(i)} />
            </Card>
          ))}
          <StepNav step={d.step} onBack={() => go((d.step - 1) as Draft['step'])} busy={busy} next={() => go(1)} nextLabel={d.photos.length ? 'Next: features' : 'Continue without a photo'} nextKind={d.photos.length ? 'primary' : 'secondary'} />
        </>
      )}

      {d.step === 1 && (
        <>
          <T v="title">Visible features</T>
          <T color={c.text2}>Compare visible features. Keep uncertain identifications uncertain. Every question can stay Unknown.</T>
          <Section title="What kind of equipment does it appear to be?">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
              {(Object.keys(CATEGORY_LABEL) as Category[]).map((k) => (
                <Chip key={k} label={k === 'unknown' ? 'Unknown' : CATEGORY_LABEL[k]} selected={d.category === k} onPress={() => up({ category: k })} />
              ))}
            </View>
            <Field label="Reason for this category (optional)" value={d.categoryReason} onChangeText={(t) => up({ categoryReason: t })} placeholder="e.g. faces traffic lanes; infrared panel" />
          </Section>
          <Section title="Mounting">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
              {MOUNTS.map((m) => (
                <Chip key={m} label={label(m)} selected={d.features.mounting === m} onPress={() => up({ features: { ...d.features, mounting: m } })} />
              ))}
            </View>
          </Section>
          <Section title="Housing form">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
              {FORMS.map((m) => (
                <Chip key={m} label={label(m)} selected={d.features.form === m} onPress={() => up({ features: { ...d.features, form: m } })} />
              ))}
            </View>
          </Section>
          <Section title="Solar panel">
            <Segmented label="Solar panel visible" options={[{ key: 'yes', label: 'Yes' }, { key: 'no', label: 'No' }, { key: 'unknown', label: 'Unknown' }]} value={d.features.solarPanel} onChange={(v) => up({ features: { ...d.features, solarPanel: v } })} />
          </Section>
          <Field label="Visible branding or model text (optional)" value={d.features.visibleText} onChangeText={(t) => up({ features: { ...d.features, visibleText: t } })} hint="Type only what is actually readable. Do not record plates or faces." autoCapitalize="none" />
          <Field label="Apparent orientation (optional)" value={d.features.apparentOrientation} onChangeText={(t) => up({ features: { ...d.features, apparentOrientation: t } })} placeholder="e.g. facing northbound lanes" />

          <Section title="Equipment that may match">
            <T v="small" color={c.text2}>Rules filter the guide by your answers. There are no probabilities — these are possibilities to compare.</T>
            {candidates.slice(0, 6).map((cd) => {
              const sel = d.selectedFamilyId === cd.entry.id;
              return (
                <Card key={cd.entry.id} style={sel ? { borderColor: c.primary, borderWidth: 2 } : undefined}>
                  <T v="heading">{cd.entry.familyLabel}</T>
                  <T v="small" color={c.text2}>{cd.entry.manufacturer}</T>
                  <T v="small" style={{ fontWeight: '600' }}>Why this may match</T>
                  {(cd.whyMatch.length ? cd.whyMatch : ['Not excluded by your answers']).map((w) => (
                    <T key={w} v="small">• {w}</T>
                  ))}
                  <T v="small" style={{ fontWeight: '600' }}>What would distinguish it</T>
                  {cd.distinguish.slice(0, 3).map((w) => (
                    <T key={w} v="small">• {w}</T>
                  ))}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
                    <Button
                      label={sel ? 'Selected as possible family' : 'Choose as possible family'}
                      kind={sel ? 'primary' : 'secondary'}
                      onPress={() => up({ selectedFamilyId: cd.entry.id, identificationLevel: 'possible_family', identificationBasis: d.identificationBasis === 'unknown' ? 'possible_family_visual_features' : d.identificationBasis, candidateFamilyIds: candidates.slice(0, 6).map((x) => x.entry.id) })}
                    />
                    <Button label="Guide" kind="ghost" onPress={() => router.push({ pathname: '/catalog/[id]', params: { id: cd.entry.id } })} />
                  </View>
                </Card>
              );
            })}
            {candidates.length === 0 && <T color={c.text2}>No guide entries fit these answers. Unknown is a valid result.</T>}
          </Section>
          <Section title="Your identification">
            <Segmented
              label="Identification level"
              options={[
                { key: 'unknown', label: 'Unknown' },
                { key: 'possible_family', label: 'Possible family' },
                { key: 'exact_model', label: 'Exact model' },
              ]}
              value={d.identificationLevel}
              onChange={(v) =>
                up({
                  identificationLevel: v,
                  identificationBasis: v === 'unknown' ? 'unknown' : v === 'exact_model' ? 'readable_label_or_documentation' : 'possible_family_visual_features',
                  selectedFamilyId: v === 'unknown' ? null : d.selectedFamilyId,
                })
              }
            />
            {d.identificationLevel === 'exact_model' && (
              <Banner kind="caution">Exact model requires readable labelling or documentation. Appearance alone supports only “possible family”.</Banner>
            )}
            {d.identificationLevel !== 'unknown' && !d.selectedFamilyId && <T v="small" color={c.caution}>Choose a family above, or set the level back to Unknown.</T>}
          </Section>
          <StepNav step={d.step} onBack={() => go((d.step - 1) as Draft['step'])} busy={busy} next={() => go(2)} nextDisabled={d.identificationLevel !== 'unknown' && !d.selectedFamilyId} />
        </>
      )}

      {d.step === 2 && (
        <>
          <T v="title">Place and distance</T>
          <T color={c.text2}>Two different positions: where you stood (photographer) and where the equipment is. Your phone location is never saved as the equipment location.</T>
          <View style={{ flexDirection: 'row', gap: SPACE.l, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 4, borderColor: '#2B59C3', backgroundColor: '#FFFFFF' }} />
              <T v="small">Photographer (ring)</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: c.mapPinUnknown }} />
              <T v="small">Equipment (filled)</T>
            </View>
          </View>
          <View style={{ height: 300, borderRadius: RADIUS.card, overflow: 'hidden', borderWidth: placing ? 3 : 1, borderColor: placing ? c.primary : c.border }}>
            <CameraMap
              installations={linked ? [linked] : []}
              selectedId={linked?.id ?? null}
              reference={null}
              center={d.equipment ? { lat: d.equipment.lat, lon: d.equipment.lon, zoom: 17 } : d.observer ? { lat: d.observer.lat, lon: d.observer.lon, zoom: 17 } : s.reference ? { lat: s.reference.lat, lon: s.reference.lon, zoom: 16 } : { lat: 41.1412, lon: -73.2637, zoom: 13 }}
              centerNonce={0}
              dark={dark}
              offline={s.settings.offlineOnly}
              palette={c}
              onSelect={() => {}}
              onRegion={() => {}}
              onPlace={
                placing
                  ? (p) => {
                      if (placing === 'equipment') up({ equipment: { lat: p.lat, lon: p.lon, uncertaintyM: d.equipmentMode === 'approximate' ? 50 : null, method: d.equipmentMode === 'approximate' ? 'approximate_area' : 'user_placed' }, equipmentMode: d.equipmentMode === 'approximate' ? 'approximate' : 'placed', installationId: d.equipmentMode === 'linked' ? null : d.installationId });
                      else up({ observer: { lat: p.lat, lon: p.lon, horizontalAccuracyM: null, fixTimestamp: null, method: 'manual_reference' } });
                      setPlacing(null);
                    }
                  : undefined
              }
              placed={d.equipmentMode !== 'none' && d.equipment && d.equipmentMode !== 'linked' ? d.equipment : null}
              observer={d.observer}
            />
          </View>
          {placing && <Banner kind="info">{placing === 'equipment' ? 'Tap the map where the equipment is.' : 'Tap the map where you stood.'}</Banner>}

          <Section title="Equipment location">
            {linked && (
              <Row title={`Linked: ${installationTitle(linked)}`} subtitle={`${placeLabelOf(linked)} · coordinates from source map`} left={<Check size={20} color={c.primary} />} />
            )}
            <Segmented
              label="Equipment location"
              options={[
                ...(linked ? [{ key: 'linked' as const, label: 'Mapped record' }] : []),
                { key: 'placed', label: 'Place pin' },
                { key: 'approximate', label: 'Uncertain' },
                { key: 'none', label: 'No coordinate' },
              ]}
              value={d.equipmentMode}
              onChange={(v) => {
                if (v === 'linked' && linked?.geometry) up({ equipmentMode: 'linked', equipment: { lat: linked.geometry.lat, lon: linked.geometry.lon, uncertaintyM: linked.geometry.precisionMeters, method: 'source_map' } });
                else if (v === 'none') up({ equipmentMode: 'none', equipment: null });
                else {
                  up({ equipmentMode: v, equipment: null });
                  startPlacing('equipment');
                }
              }}
            />
            {d.equipment && (
              <KV
                k="Equipment coordinate"
                v={`${d.equipment.lat.toFixed(5)}, ${d.equipment.lon.toFixed(5)} · ${({ source_map: 'source map', user_placed: 'user placed', photo_metadata: 'photo metadata', approximate_area: 'approximate area' } as const)[d.equipment.method]}${d.equipment.uncertaintyM != null ? ` · ±${d.equipment.uncertaintyM} m` : ''}`}
              />
            )}
            {(d.equipmentMode === 'placed' || d.equipmentMode === 'approximate') && <Button label={d.equipment ? 'Move equipment pin' : 'Tap map to place equipment'} kind="secondary" icon={<MapPin size={18} color={c.primary} />} onPress={() => startPlacing('equipment')} />}
          </Section>

          <Section title="Where you stood (optional)">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
              <Button label="Use my current location" kind="secondary" busy={busy} icon={<LocateFixed size={18} color={c.primary} />} onPress={useMyLocationAsObserver} />
              <Button label="Place on map" kind="secondary" onPress={() => startPlacing('observer')} />
              {d.photos[0]?.photoMetadata.gps && (
                <Button label="Use photo metadata" kind="secondary" onPress={() => up({ observer: { lat: d.photos[0].photoMetadata.gps!.lat, lon: d.photos[0].photoMetadata.gps!.lon, horizontalAccuracyM: null, fixTimestamp: exifToIso(d.photos[0].photoMetadata), method: 'photo_metadata' } })} />
              )}
              {d.observer && <Button label="Clear" kind="ghost" onPress={() => up({ observer: null })} />}
            </View>
            {d.observer && (
              <KV
                k="Photographer position"
                v={`${d.observer.lat.toFixed(5)}, ${d.observer.lon.toFixed(5)} · ${d.observer.method === 'gps_fix' ? `phone fix${d.observer.horizontalAccuracyM != null ? ` ±${Math.round(d.observer.horizontalAccuracyM)} m` : ''}` : d.observer.method === 'photo_metadata' ? 'photo metadata (not verified)' : 'placed by you'}`}
              />
            )}
            {(() => {
              const snap = distanceSnapshot(d, new Date().toISOString());
              if (!snap) return <T v="small" color={c.text2}>Distance appears when both positions are set.</T>;
              return (
                <T v="small" style={{ fontVariant: ['tabular-nums'] }}>
                  {`About ${roundForDisplay(snap.meters, s.settings.units).text} between photographer and equipment · straight-line${d.observer?.method === 'photo_metadata' ? ' · historical (photo metadata)' : d.observer?.method === 'gps_fix' ? ' · current' : ''}`}
                </T>
              );
            })()}
          </Section>

          <Section title="Direction the equipment faces (optional)">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
              {DIRS.map((x) => (
                <Chip key={x} label={x} selected={d.direction === x} onPress={() => up({ direction: d.direction === x ? null : x })} />
              ))}
              <Chip label="Unknown" selected={!d.direction} onPress={() => up({ direction: null })} />
            </View>
          </Section>
          <Field label="Place label (optional)" value={d.placeLabel} onChangeText={(t) => up({ placeLabel: t })} placeholder="e.g. Post Rd near Unquowa Rd" hint="Shown in exports only if you choose to include it." />
          <StepNav step={d.step} onBack={() => go((d.step - 1) as Draft['step'])} busy={busy} next={() => go(3)} nextLabel="Next: review" />
        </>
      )}

      {d.step === 3 && (
        <>
          <T v="title">Review</T>
          {d.photos[0] && <PhotoView load={() => nb.draftPhoto(d.photos[0].blobId)} deps={[d.photos[0].blobId]} label="First photo" aspect={d.photos[0].width / Math.max(1, d.photos[0].height)} />}
          <Card>
            <KV k="Photos" v={`${d.photos.length} (private originals)`} />
            <KV k="Equipment type" v={CATEGORY_LABEL[d.category]} />
            <KV k="Identification" v={d.identificationLevel === 'unknown' ? 'Unknown' : `${d.identificationLevel === 'exact_model' ? 'Exact model' : 'Possible family'}: ${CATALOG.find((x) => x.id === d.selectedFamilyId)?.familyLabel ?? d.selectedFamilyId}`} />
            <KV k="Basis" v={({ unknown: 'Not identified', possible_family_visual_features: 'Visible features only', readable_label_or_documentation: 'Readable label or documentation', linked_public_record: 'Linked public record' } as const)[d.identificationBasis]} />
            <KV k="Linked mapped record" v={linked ? installationTitle(linked) : 'None'} />
            <KV k="Equipment location" v={d.equipment && d.equipmentMode !== 'none' ? `${d.equipment.lat.toFixed(5)}, ${d.equipment.lon.toFixed(5)} (${({ source_map: 'from source map', user_placed: 'placed by you', photo_metadata: 'photo metadata', approximate_area: 'approximate area' } as const)[d.equipment.method]})` : 'Not recorded'} />
            <KV k="Photographer position" v={d.observer ? `${({ gps_fix: 'Phone location fix', manual_reference: 'Placed by you', photo_metadata: 'Photo metadata' } as const)[d.observer.method]} · private` : 'Not recorded'} />
            <KV k="Place label" v={d.placeLabel || 'None'} />
            <KV k="Sources" v={`${linked ? 'Linked public record' : 'None from a public record'}${d.userSources?.length ? ` + ${d.userSources.length} you added` : ''}`} />
          </Card>
          <Section title="Observation time">
            <Segmented
              label="Event time basis"
              options={[
                ...(d.photos[0]?.origin === 'inAppCapture' ? [{ key: 'capture' as const, label: 'Capture time' }] : []),
                ...(d.photos[0] && exifToIso(d.photos[0].photoMetadata) ? [{ key: 'photo_metadata' as const, label: 'Photo metadata' }] : []),
                { key: 'unknown', label: 'Unknown' },
              ]}
              value={d.timeChoice}
              onChange={(v) => up({ timeChoice: v })}
            />
            {(() => {
              const t = observedTime(d);
              return <T v="small" color={c.text2}>{t.observedAt ? `${fmtDate(t.observedAt, true)} — ${t.basis === 'photo_metadata' ? 'from photo metadata (not verified)' : 'phone clock at capture (not independently attested)'}` : 'Event time not established'}</T>;
            })()}
          </Section>
          <Section title="Sources you add (optional)">
            <SourceLinkList sources={d.userSources ?? []} onRemove={(sid) => up({ userSources: (d.userSources ?? []).filter((x) => x.id !== sid) })} />
            {addingSource ? (
              <SourceLinkForm
                onAdd={(src) => {
                  up({ userSources: [...(d.userSources ?? []), src] });
                  setAddingSource(false);
                }}
                onCancel={() => setAddingSource(false)}
              />
            ) : (
              <Button label="Add a source link" kind="secondary" onPress={() => setAddingSource(true)} />
            )}
            <T v="caption" color={c.text2}>
              {linked ? 'Sources of the linked public record are attached automatically. ' : ''}A link is a pointer, not a verified claim.
            </T>
          </Section>
          <Field label="Private notes (optional)" value={d.localNotes} onChangeText={(t) => up({ localNotes: t })} multiline style={{ minHeight: 96 }} hint="Notes stay private. They are never included in public exports." />
          <Banner kind="info" title="Saved privately">This record is saved only on this device. Nothing is submitted or published. You decide later what to share.</Banner>
          <StepNav step={d.step} onBack={() => go((d.step - 1) as Draft['step'])} busy={busy} next={save} nextLabel="Save observation" />
        </>
      )}
      {confirmDiscard ? (
        <Banner
          kind="caution"
          title="Discard this draft?"
          action={
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
              <Button label="Keep draft" kind="secondary" onPress={() => setConfirmDiscard(false)} />
              <Button label={resumed ? 'Discard and start new' : 'Discard'} kind="danger" onPress={() => discard(resumed)} />
            </View>
          }
        >
          {`Its ${d.photos.length} photo${d.photos.length === 1 ? '' : 's'} and answers will be removed from this device. Saved observations are not affected.`}
        </Banner>
      ) : (
        <Button label="Discard draft" kind="ghost" onPress={() => setConfirmDiscard(true)} />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: 0.8 }}>
        <ChevronRight size={14} color={c.text2} />
        <T v="caption" color={c.text2}>Your draft is saved automatically and survives closing the app.</T>
      </View>
    </ScrollView>
  );
}

