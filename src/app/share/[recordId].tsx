/**
 * S14 Share studio (Flow D). Every format is generated from the same deterministic public projection.
 * Privacy summary before sharing; honest outcome statuses ("Share sheet opened", never "Shared").
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Share2, Download, Copy, ShieldAlert } from 'lucide-react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, DemoBanner, Empty, Loading, Pill, Screen, Section, Segmented, T, Toggle } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { loadBundle, projectionFor, reviewedAttachments, derivativeFor, evidenceFor, bytesToBase64, type RecordBundle } from '../../features/exportService';
import { DEFAULT_DISCLOSURE, captions, type DisclosureChoices, type DateGranularity } from '../../domain/projection';
import { renderCard, PRESETS, type CardPreset } from '../../domain/card';
import { schematicFor } from '../../domain/schematics';
import { CardPreview } from '../../features/share/CardPreview';
import { rasterize } from '../../platform/raster';
import { shareBytes, saveBytes, copyText, type ShareOutcome } from '../../platform/files';
import { sha256Hex } from '../../domain/hash';
import { safeFileStem } from '../../features/format';
import { log } from '../../platform/diagnostics';

type Format = CardPreset | 'report' | 'evidence';
const FORMATS: { key: Format; label: string }[] = [
  { key: 'portrait', label: 'Portrait' },
  { key: 'square', label: 'Square' },
  { key: 'story', label: 'Story' },
  { key: 'wide', label: 'Wide' },
  { key: 'report', label: 'Report PDF' },
  { key: 'evidence', label: 'Evidence ZIP' },
];

export default function ShareStudio() {
  const { recordId } = useLocalSearchParams<{ recordId: string }>();
  const s = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const { width: winW } = useWindowDimensions();
  const [b, setB] = useState<RecordBundle | null | undefined>(undefined);
  const [fmt, setFmt] = useState<Format>('portrait');
  const [ch, setCh] = useState<DisclosureChoices>({ ...DEFAULT_DISCLOSURE });
  const [photoUri, setPhotoUri] = useState<{ uri: string; aspect: number } | null>(null);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ kind: 'info' | 'caution' | 'error'; title: string; text: string } | null>(null);
  const [privateFull, setPrivateFull] = useState(false);
  const [privateConfirm, setPrivateConfirm] = useState(false);
  const previewRef = useRef<View>(null);

  useEffect(() => {
    loadBundle(s, String(recordId))
      .then(setB)
      .catch((e) => {
        log('error', 'share.load', (e as Error).message);
        setB(null);
      });
  }, [recordId, s]);

  const approved = useMemo(() => (b ? reviewedAttachments(b) : []), [b]);
  const unreviewed = b ? b.attachments.length - approved.length : 0;

  // Approved derivative of the first reviewed photo for card previews.
  useEffect(() => {
    if (!b || !approved.length) return setPhotoUri(null);
    let alive = true;
    derivativeFor(s, approved[0])
      .then((d) => alive && setPhotoUri({ uri: `data:image/jpeg;base64,${bytesToBase64(d.bytes)}`, aspect: d.width / d.height }))
      .catch((e) => alive && setPhotoErr((e as Error).message));
    return () => {
      alive = false;
    };
  }, [b, approved, s]);

  const projection = useMemo(() => (b ? projectionFor(s, b, ch) : null), [b, ch, s]);
  const cap = useMemo(() => (projection ? captions(projection) : null), [projection]);
  const isCard = fmt !== 'report' && fmt !== 'evidence';
  const card = useMemo(() => {
    if (!projection || !isCard) return null;
    const usePhoto = ch.includePhoto && photoUri;
    return renderCard({
      projection,
      preset: fmt as CardPreset,
      photoDataUri: usePhoto ? photoUri.uri : null,
      photoAspect: usePhoto ? photoUri.aspect : undefined,
      schematicSvg: schematicFor(b?.observation.selectedFamilyId),
    });
  }, [projection, fmt, ch.includePhoto, photoUri, isCard, b]);

  const set = (patch: Partial<DisclosureChoices>) => setCh({ ...ch, ...patch });

  const report = useCallback(
    (kind: string, o: ShareOutcome, sha: string | null) => {
      const ok = o.status === 'Share sheet opened' || o.status === 'Export saved';
      setOutcome({ kind: ok ? 'info' : o.status === 'Canceled' ? 'caution' : 'error', title: o.status, text: o.detail });
      if (b && o.status !== 'Canceled') s.notebook.logExport(b.observation.id, kind, o.status, sha).catch(() => {});
    },
    [b, s.notebook],
  );

  const produce = async (): Promise<{ name: string; bytes: Uint8Array; mime: string; kind: string } | null> => {
    if (!b || !projection) return null;
    const stem = safeFileStem(`sightline-${b.observation.id.slice(0, 8)}`);
    if (isCard && card) {
      const { w, h } = PRESETS[fmt as CardPreset];
      const png = await rasterize(card.svg, w, h, previewRef);
      return { name: `${stem}-${fmt}.png`, bytes: png, mime: 'image/png', kind: `card:${fmt}` };
    }
    const profile = privateFull ? 'private-full-evidence' : undefined;
    const ev = await evidenceFor(s, b, ch, profile, privateFull && privateConfirm);
    if (fmt === 'report') return { name: `${stem}-report.pdf`, bytes: ev.files['report.pdf'], mime: 'application/pdf', kind: 'report' };
    return { name: `${stem}-evidence.zip`, bytes: ev.zip, mime: 'application/zip', kind: privateFull ? 'evidence:private-full' : 'evidence' };
  };

  const run = async (mode: 'share' | 'save') => {
    setBusy(true);
    setOutcome(null);
    try {
      const f = await produce();
      if (!f) return;
      const sha = sha256Hex(f.bytes);
      const o = mode === 'share' ? await shareBytes(f.name, f.bytes, f.mime, 'Share from Sightline') : await saveBytes(f.name, f.bytes, f.mime);
      report(f.kind, o, sha);
    } catch (e) {
      log('error', 'share.produce', (e as Error).message);
      setOutcome({ kind: 'error', title: 'Export failed', text: `${(e as Error).message}. Nothing was shared. Your record is unchanged.` });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (what: 'caption' | 'question' | 'alt') => {
    if (!cap) return;
    const ok = await copyText(what === 'caption' ? cap.neutral : what === 'question' ? cap.question : cap.alt);
    setOutcome(ok ? { kind: 'info', title: 'Copied', text: `${what === 'alt' ? 'Alt text' : 'Caption'} copied to the clipboard. Paste it where you share.` } : { kind: 'error', title: 'Copy unavailable', text: 'The clipboard is not available here. Select and copy the text below manually.' });
  };

  if (b === undefined) return <Loading label="Preparing share studio…" />;
  if (b === null || !projection || !cap)
    return (
      <Screen>
        <Empty title="Record not found" body="It may have been deleted." action={<Button label="Go to Notebook" onPress={() => router.replace('/notebook')} />} />
      </Screen>
    );

  const displayW = Math.min(winW - 40, 520, isCard ? (fmt === 'story' ? 300 : fmt === 'wide' ? 520 : 400) : 400);
  const willInclude: string[] = [
    `Type: ${projection.categoryLabel}`,
    projection.identification.familyLabel ? `Identification: ${projection.identification.familyLabel}` : 'Identification: not stated',
    projection.placeLabel ? `Place label: “${projection.placeLabel}”` : 'No place label',
    projection.observedDateText ? `Date: ${projection.observedDateText}` : 'No date',
    projection.equipmentCoordinates ? `Equipment coordinates (rounded to ${ch.coordinateDecimals} decimals)` : 'No coordinates',
    ch.includePhoto && approved.length ? `${isCard ? 1 : approved.length} approved, metadata-free photo derivative${!isCard && approved.length > 1 ? 's' : ''}` : 'No photo (schematic only)',
    projection.sources.length ? `${projection.sources.length} public source citation${projection.sources.length > 1 ? 's' : ''}` : 'No source citations',
  ];
  const never = ['Your position (where you stood)', 'Private notes', 'Original photos & EXIF/GPS', 'Original filenames', 'Precise device time', 'Device identifiers'];
  if (privateFull) never.splice(0, never.length, 'Device identifiers');

  return (
    <Screen scroll>
      {projection.demonstration ? <DemoBanner /> : null}
      <Segmented label="Format" options={FORMATS} value={fmt} onChange={(k) => (setFmt(k), setOutcome(null))} />

      <View style={{ alignItems: 'center', marginTop: SPACE.l }}>
        {isCard && card ? (
          <CardPreview ref={previewRef} svg={card.svg} width={card.width} height={card.height} displayWidth={displayW} label={cap.alt} />
        ) : (
          <Card>
            <T v="heading">{fmt === 'report' ? 'Evidence report (PDF)' : 'Evidence package (ZIP)'}</T>
            <T v="small" style={{ color: c.text2, marginTop: SPACE.xs }}>
              {fmt === 'report'
                ? 'A readable report with headline, identification, sources, approved photos, chronology, methodology, limitations and file checksums. The PDF is not tagged for accessibility; the ZIP includes an accessible HTML version.'
                : 'Contains report.pdf, report.html, approved photo derivatives, public record JSON, revisions, sources, README, LICENSES, manifest.json and checksums.sha256. Anyone can check file integrity with the verifier.'}
            </T>
          </Card>
        )}
      </View>
      {card?.overflow.length ? (
        <Banner kind="caution" title="Text shortened to fit">
          {card.overflow.join(' ')}
        </Banner>
      ) : null}

      <Section title="What to include">
        <Card>
          <Toggle
            label="Approved photo"
            hint={approved.length ? (photoErr ? `Photo could not be prepared: ${photoErr}` : 'Uses the redacted, metadata-free derivative you approved.') : b.attachments.length ? 'No photo approved yet — review a photo first. A schematic is used instead.' : 'No photos in this record; a schematic is used.'}
            value={ch.includePhoto && approved.length > 0}
            onChange={(v) => set({ includePhoto: v })}
          />
          {unreviewed > 0 ? (
            <View style={{ marginTop: SPACE.s }}>
              <Button kind="ghost" label={`Review ${unreviewed} unapproved photo${unreviewed > 1 ? 's' : ''}`} onPress={() => router.push({ pathname: '/observation/redact', params: { attachmentId: b.attachments.find((a) => !a.redactionReviewedAt)!.id, recordId: b.observation.id } })} />
            </View>
          ) : null}
          <Toggle label="Equipment coordinates" hint={b.observation.equipmentLocation ? 'Rounded. Your own position is never included.' : 'This record has no equipment location.'} value={ch.includeEquipmentCoordinates && !!b.observation.equipmentLocation} onChange={(v) => set({ includeEquipmentCoordinates: v })} />
          {ch.includeEquipmentCoordinates ? (
            <Segmented
              label="Coordinate precision"
              options={[
                { key: '3', label: '≈110 m' },
                { key: '4', label: '≈11 m' },
                { key: '5', label: '≈1 m' },
              ]}
              value={String(ch.coordinateDecimals) as '3' | '4' | '5'}
              onChange={(k) => set({ coordinateDecimals: Number(k) as 3 | 4 | 5 })}
            />
          ) : null}
          <T v="small" style={{ marginTop: SPACE.m, color: c.text2 }}>Date shown</T>
          <Segmented
            label="Date granularity"
            options={[
              { key: 'day', label: 'Day' },
              { key: 'month', label: 'Month' },
              { key: 'year', label: 'Year' },
              { key: 'none', label: 'None' },
            ]}
            value={ch.dateGranularity}
            onChange={(k) => set({ dateGranularity: k as DateGranularity })}
          />
          <T v="small" style={{ marginTop: SPACE.m, color: c.text2 }}>Location label</T>
          <Segmented
            label="Location label"
            options={[
              { key: 'place', label: 'Place label' },
              { key: 'generalized', label: 'Generalized' },
              { key: 'none', label: 'None' },
            ]}
            value={ch.locationLabel}
            onChange={(k) => set({ locationLabel: k as DisclosureChoices['locationLabel'], generalizedLabel: k === 'generalized' ? 'Fairfield County, CT' : undefined })}
          />
          <Toggle label="Source citations" value={ch.includeSources} onChange={(v) => set({ includeSources: v })} />
          <Toggle label="Distance from where I stood" hint="Off by default. Reveals approximately where you were." value={ch.includeObserverDistance} onChange={(v) => set({ includeObserverDistance: v })} />
          {fmt === 'evidence' ? (
            <>
              <Toggle label="Private full evidence (for a lawyer or records officer)" hint="Adds original photos with metadata, exact time, your position and notes. Off by default." value={privateFull} onChange={(v) => (setPrivateFull(v), setPrivateConfirm(false))} />
              {privateFull ? (
                <Banner kind="caution" title="This package will contain sensitive data">
                  Original photos may include GPS and device details. Your position, exact time and private notes are included. Share it only with someone you trust.
                </Banner>
              ) : null}
              {privateFull ? <Toggle label="I reviewed this and want to include private data" value={privateConfirm} onChange={setPrivateConfirm} /> : null}
            </>
          ) : null}
        </Card>
      </Section>

      <Section title="Privacy summary">
        <Card>
          <T v="small" style={{ fontWeight: '600' }}>Will be included</T>
          {willInclude.map((x) => (
            <T key={x} v="small" style={{ marginTop: 2 }}>
              • {x}
            </T>
          ))}
          <T v="small" style={{ fontWeight: '600', marginTop: SPACE.m }}>Never included{privateFull ? '' : ' in this format'}</T>
          {never.map((x) => (
            <T key={x} v="small" style={{ marginTop: 2, color: c.text2 }}>
              • {x}
            </T>
          ))}
          <View style={{ flexDirection: 'row', gap: SPACE.s, marginTop: SPACE.m, flexWrap: 'wrap' }}>
            <Pill label={projection.sourceStatus} />
            <Pill label="Location report ≠ proof of recording" tone="caution" />
          </View>
        </Card>
      </Section>

      {outcome ? (
        <View style={{ marginTop: SPACE.m }}>
          <Banner kind={outcome.kind} title={outcome.title}>
            {outcome.text}
          </Banner>
        </View>
      ) : null}

      <View style={{ gap: SPACE.s, marginTop: SPACE.l }}>
        <Button label="Share…" icon={<Share2 size={20} color={c.onPrimary} />} busy={busy} disabled={busy || (privateFull && !privateConfirm)} onPress={() => run('share')} testID="share-run" />
        <Button kind="secondary" label="Save to files" icon={<Download size={20} color={c.primary} />} disabled={busy || (privateFull && !privateConfirm)} onPress={() => run('save')} testID="share-save" />
        {privateFull && !privateConfirm ? (
          <View style={{ flexDirection: 'row', gap: SPACE.s, alignItems: 'center' }}>
            <ShieldAlert size={16} color={c.caution} />
            <T v="caption" style={{ color: c.text2, flex: 1 }}>Confirm the private-data review above to enable export.</T>
          </View>
        ) : null}
      </View>

      <Section title="Captions">
        <Card>
          <T v="small" style={{ fontWeight: '600' }}>Neutral caption</T>
          <T v="small" selectable style={{ marginTop: SPACE.xs }}>
            {cap.neutral}
          </T>
          <Button kind="ghost" label="Copy caption" icon={<Copy size={18} color={c.primary} />} onPress={() => copy('caption')} />
          <T v="small" style={{ fontWeight: '600', marginTop: SPACE.m }}>Question for officials</T>
          <T v="small" selectable style={{ marginTop: SPACE.xs }}>
            {cap.question}
          </T>
          <Button kind="ghost" label="Copy question" icon={<Copy size={18} color={c.primary} />} onPress={() => copy('question')} />
          <T v="small" style={{ fontWeight: '600', marginTop: SPACE.m }}>Alt text for the card image</T>
          <T v="small" selectable style={{ marginTop: SPACE.xs }}>
            {cap.alt}
          </T>
          <Button kind="ghost" label="Copy alt text" icon={<Copy size={18} color={c.primary} />} onPress={() => copy('alt')} />
        </Card>
      </Section>
      <T v="caption" style={{ color: c.text2, marginTop: SPACE.l }}>
        Sightline doesn’t post anything. “Share sheet opened” means your device’s share menu appeared; it cannot tell whether you sent the file.
      </T>
    </Screen>
  );
}
