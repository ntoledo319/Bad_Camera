/** S05 Camera detail (full page): four independent panels; unknown → "Not established". */
import React, { useEffect, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Bookmark, BookmarkCheck, NotebookPen, ExternalLink, ChevronRight, Navigation, Share2, FilePlus2 } from 'lucide-react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, DemoBanner, Empty, KV, Pill, Row, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { CategoryIcon } from '../../features/CategoryIcon';
import { capitalize, claimDisplay, claimValue, directionLabel, distanceFor, fmtDate, installationTitle, LIFECYCLE_LABEL, manufacturerName, NOT_ESTABLISHED, observationTitle, observedLabel, placeLabelOf, sourceBadge, sourceEditLabel } from '../../features/format';
import { CATEGORY_LABEL } from '../../domain/projection';
import { shareBytes, copyText } from '../../platform/files';
import { utf8ToBytes } from '../../domain/hash';
import { CATALOG_BY_ID, MANUFACTURER_TO_FAMILIES } from '../../../content/catalog/catalog';
import { roundForDisplay, cardinal, bearingDegrees } from '../../domain/distance';
import type { Observation } from '../../domain/schemas';

export default function CameraDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const inst = id ? s.installation(String(id)) : null;
  const [bm, setBm] = useState(false);
  const [local, setLocal] = useState<Observation[]>([]);
  const [showDist, setShowDist] = useState(false);
  const [confirmMaps, setConfirmMaps] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!inst) return;
    s.notebook.bookmarks().then((b) => setBm(b.some((x) => x.installationId === inst.id)));
    s.notebook.listLatest().then((o) => setLocal(o.filter((x) => x.installationId === inst.id)));
  }, [inst, s.notebook, s.rev]);

  if (!inst)
    return (
      <Screen>
        <Empty title="Record not found" body="This mapped record is not in the loaded data. It may have been removed in a refresh, or demo mode may be on." action={<Button label="Back to Explore" onPress={() => router.replace('/explore')} />} />
      </Screen>
    );

  const claims = s.claimsFor(inst.id);
  const geomSource = inst.geometry?.sourceId ? s.source(inst.geometry.sourceId) : null;
  const mfr = manufacturerName(inst);
  const mount = claimValue(claims, 'hardware.mount');
  const operator = claimValue(claims, 'operator.name');
  const direction = claimValue(claims, 'location.direction');
  const check = claimValue(claims, 'observation.checkDate');
  const families = inst.familyId ? [inst.familyId] : inst.manufacturerId ? (MANUFACTURER_TO_FAMILIES[inst.manufacturerId] ?? []).filter((f) => CATALOG_BY_ID[f]?.category === inst.category) : [];
  const d = distanceFor(inst, s.reference, s.settings.units);
  const sourceIds = [...new Set(claims.map((x) => x.sourceId))];

  const shareSummary = async () => {
    const src = geomSource;
    const text = [
      `${installationTitle(inst)} — ${placeLabelOf(inst)}`,
      `Source status: ${sourceBadge(inst, claims)}. ${observedLabel(inst)}.`,
      src ? `Source: ${src.title} (${src.publisher})${src.url ? ` ${src.url}` : ''}` : null,
      'A map record is a report, not proof that a camera is operating or recorded anyone.',
    ]
      .filter(Boolean)
      .join('\n');
    const r = await shareBytes(`sightline-${inst.id}.txt`, utf8ToBytes(text), 'text/plain', 'Share mapped record');
    if (r.status === 'Sharing unavailable') setShareMsg((await copyText(text)) ? 'Sharing is unavailable here, so the summary was copied to your clipboard.' : r.detail);
    else setShareMsg(r.status);
  };

  const claimNote = (cl?: { basis: string; status: string }) => (cl ? `${cl.basis === 'sourceReported' ? 'Reported by source' : cl.basis === 'directlyObserved' ? 'Directly observed' : 'Inferred'} · ${cl.status}` : undefined);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Mapped record' }} />
      {inst.isDemo && <DemoBanner />}
      <View style={{ flexDirection: 'row', gap: SPACE.m, alignItems: 'center' }}>
        <CategoryIcon category={inst.category} size={52} />
        <View style={{ flex: 1 }}>
          <T v="title">{installationTitle(inst)}</T>
          <T color={c.text2}>{placeLabelOf(inst)}</T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
        <Pill label={sourceBadge(inst, claims)} tone="primary" />
        <Pill label={observedLabel(inst)} />
        <Pill label={sourceEditLabel(inst)} />
      </View>
      {d ? (
        <Card onPress={() => setShowDist((v) => !v)} accessibilityLabel={`${d.primary}. Tap for distance details.`}>
          <T v="heading" style={{ fontVariant: ['tabular-nums'] }}>
            {d.primary}
          </T>
          {d.qualifiers.map((q) => (
            <T key={q} v="small" color={c.caution}>
              {q}
            </T>
          ))}
          <T v="caption" color={c.primary}>
            {showDist ? 'Hide distance details' : 'Distance details'}
          </T>
          {showDist && (
            <View style={{ gap: SPACE.xs }}>
              <KV k="Straight-line distance" v={roundForDisplay(d.meters, s.settings.units).text} />
              <KV k="Measured from" v={s.reference?.kind === 'current_fix' ? 'Phone location fix' : s.reference?.kind === 'photo_metadata' ? 'Photo metadata (not verified)' : 'A point you chose'} />
              <KV k="Phone horizontal accuracy" v={s.reference?.accuracyM != null ? `±${roundForDisplay(s.reference.accuracyM, s.settings.units).text}` : 'Not reported'} />
              <KV k="Fix time" v={s.reference?.timestamp ? fmtDate(s.reference.timestamp, true) : 'Not applicable'} />
              <KV k="Mapped-location precision" v={inst.geometry?.precisionMeters != null ? `±${roundForDisplay(inst.geometry.precisionMeters, s.settings.units).text}` : NOT_ESTABLISHED} />
              {d.envelope && <KV k="Rough envelope" v={d.envelope.text} />}
              <KV k="Direction from reference" v={s.reference && inst.geometry ? cardinal(bearingDegrees(s.reference, inst.geometry)) : NOT_ESTABLISHED} />
              <T v="caption" color={c.text2}>
                Straight-line (haversine) distance, not a walking or driving route. It does not indicate what a camera can see.
              </T>
            </View>
          )}
        </Card>
      ) : (
        <Banner kind="info">Choose a reference point (search → coordinates) or use your location on Explore to see an approximate distance.</Banner>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
        <Button
          label={bm ? 'Bookmarked' : 'Save bookmark'}
          kind="secondary"
          icon={bm ? <BookmarkCheck size={18} color={c.primary} /> : <Bookmark size={18} color={c.primary} />}
          onPress={async () => {
            setBm(await s.notebook.toggleBookmark(inst.id, `${installationTitle(inst)} — ${placeLabelOf(inst)}`));
            s.bump();
          }}
          style={{ flexGrow: 1 }}
        />
        <Button label="Record observation" icon={<NotebookPen size={18} color={c.onPrimary} />} onPress={() => router.push({ pathname: '/observation/new', params: { installationId: inst.id } })} style={{ flexGrow: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
        <Button label="Share summary" kind="ghost" icon={<Share2 size={18} color={c.primary} />} onPress={shareSummary} />
        <Button
          label="Add source or correction"
          kind="ghost"
          icon={<FilePlus2 size={18} color={c.primary} />}
          onPress={() => router.push({ pathname: '/observation/new', params: { installationId: inst.id, mode: 'correction' } })}
        />
      </View>
      {shareMsg && (
        <Banner kind="info" action={<Button kind="ghost" label="Dismiss" onPress={() => setShareMsg(null)} />}>
          {shareMsg}
        </Banner>
      )}

      <Section title="Hardware">
        <Card>
          <KV k="Equipment type" v={inst.category === 'unknown' ? NOT_ESTABLISHED : CATEGORY_LABEL[inst.category]} />
          <KV k="Manufacturer (as reported)" v={mfr ?? NOT_ESTABLISHED} />
          <KV k="Model" v={inst.modelId ?? NOT_ESTABLISHED} />
          <KV k="Mounting" v={mount ? claimDisplay('hardware.mount', mount.value).value : NOT_ESTABLISHED} />
          <KV k="Deployment" v={inst.deploymentMode === 'unknown' ? NOT_ESTABLISHED : capitalize(inst.deploymentMode.replace(/_/g, ' '))} />
          {mfr && <T v="caption" color={c.text2}>{claimNote(claimValue(claims, 'hardware.manufacturer'))}. A manufacturer is not the operator.</T>}
          {families.map((f) =>
            CATALOG_BY_ID[f] ? <Row key={f} title={`Guide: ${CATALOG_BY_ID[f].familyLabel}`} subtitle="What it does, visible cues, lookalikes" onPress={() => router.push({ pathname: '/catalog/[id]', params: { id: f } })} right={<ChevronRight size={18} color={c.text2} />} /> : null,
          )}
        </Card>
      </Section>
      <Section title="Location">
        <Card>
          <KV k="Mapped coordinates" v={inst.geometry ? `${inst.geometry.lat.toFixed(5)}, ${inst.geometry.lon.toFixed(5)}` : NOT_ESTABLISHED} />
          <KV k="Coordinate method" v={inst.geometry ? ({ source_map: 'Source map point', user_placed: 'User placed', photo_metadata: 'Photo metadata', relation_centroid: 'Approximate (centre of a mapped area)', unknown: NOT_ESTABLISHED } as const)[inst.geometry.method] : NOT_ESTABLISHED} />
          <KV k="Coordinate precision" v={inst.geometry?.precisionMeters != null ? `±${inst.geometry.precisionMeters} m` : NOT_ESTABLISHED} />
          <KV k="Facing direction" v={direction ? `${directionLabel(String(direction.value))} · as reported` : NOT_ESTABLISHED} />
          <KV k="Last in-person check" v={check ? fmtDate(String(check.value)) : 'Observation date unknown'} />
          <KV k="Map record last edited" v={fmtDate(inst.sourceModifiedAt)} />
          {inst.geometry && (
            <Button label="Open in system maps" kind="ghost" icon={<Navigation size={18} color={c.primary} />} onPress={() => setConfirmMaps(true)} />
          )}
          {confirmMaps && inst.geometry && (
            <Banner
              kind="caution"
              title="Leave Sightline?"
              action={
                <View style={{ flexDirection: 'row', gap: SPACE.s }}>
                  <Button label="Cancel" kind="secondary" onPress={() => setConfirmMaps(false)} />
                  <Button
                    label="Open maps"
                    onPress={() => {
                      setConfirmMaps(false);
                      const { lat, lon } = inst.geometry!;
                      const url = Platform.OS === 'ios' ? `http://maps.apple.com/?ll=${lat},${lon}` : Platform.OS === 'android' ? `geo:${lat},${lon}?q=${lat},${lon}` : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=18/${lat}/${lon}`;
                      Linking.openURL(url).catch(() => {});
                    }}
                  />
                </View>
              }
            >
              These coordinates will be sent to your maps app. Sightline offers no route that claims to avoid cameras.
            </Banner>
          )}
        </Card>
      </Section>
      <Section title="Operator">
        <Card>
          <KV k="Operator (as reported)" v={(operator?.value as string) ?? NOT_ESTABLISHED} />
          {operator && <T v="caption" color={c.text2}>{claimNote(operator)}</T>}
          <T v="caption" color={c.text2}>
            Who operates or can access this equipment is often not public. A manufacturer badge never identifies an operator.
          </T>
        </Card>
      </Section>
      <Section title="Network connections">
        <Card>
          <KV k="Data sharing / network" v={inst.networkClaimIds.length ? `${inst.networkClaimIds.length} claim(s)` : NOT_ESTABLISHED} />
          <T v="caption" color={c.text2}>
            Sharing arrangements are established only by documents such as agreements or audit logs — not by appearance or brand.
          </T>
        </Card>
      </Section>

      <Section title="Sources">
        {geomSource && (
          <Row title={geomSource.title} subtitle={`${geomSource.publisher} · retrieved ${fmtDate(geomSource.accessedAt)}`} onPress={() => router.push({ pathname: '/sources/[id]', params: { id: geomSource.id } })} right={<ChevronRight size={18} color={c.text2} />} />
        )}
        {sourceIds
          .filter((x) => x !== geomSource?.id)
          .map((sid) => {
            const src = s.source(sid);
            return src ? <Row key={sid} title={src.title} subtitle={src.publisher} onPress={() => router.push({ pathname: '/sources/[id]', params: { id: sid } })} right={<ChevronRight size={18} color={c.text2} />} /> : null;
          })}
        {geomSource?.url && <Button label="Open source page" kind="ghost" icon={<ExternalLink size={18} color={c.primary} />} onPress={() => Linking.openURL(geomSource.url!).catch(() => {})} />}
      </Section>

      <Section title="Claims in this record">
        <Card>
          {claims.length === 0 && <T color={c.text2}>No claims recorded.</T>}
          {claims.map((cl) => (
            <View key={cl.id} style={{ gap: 2, paddingVertical: 4 }}>
              <T v="small" style={{ fontWeight: '600' }}>
                {`${claimDisplay(cl.fieldPath, cl.value).label}: ${claimDisplay(cl.fieldPath, cl.value).value}`}
              </T>
              <T v="caption" color={c.text2}>
                {claimNote(cl)} · {s.source(cl.sourceId)?.publisher ?? cl.sourceId}
              </T>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Chronology">
        <Card>
          <KV k="First reported" v={fmtDate(inst.firstReportedAt)} />
          <KV k="Last in-person observation" v={inst.lastObservedAt ? fmtDate(inst.lastObservedAt) : 'Observation date unknown'} />
          <KV k="Map record edited" v={fmtDate(inst.sourceModifiedAt)} />
          <KV k="Fetched into Sightline" v={fmtDate(inst.fetchedAt, true)} />
          <KV k="Lifecycle" v={LIFECYCLE_LABEL[inst.lifecycle]} />
        </Card>
      </Section>

      <Section title="Your observations here">
        {local.length === 0 ? (
          <T color={c.text2}>None yet. Observations are private to this device.</T>
        ) : (
          local.map((o) => <Row key={o.id} title={observationTitle(o)} subtitle={fmtDate(o.observedAt ?? o.deviceRecordedAt, true)} onPress={() => router.push({ pathname: '/observation/[id]', params: { id: o.id } })} right={<ChevronRight size={18} color={c.text2} />} />)
        )}
      </Section>
      <T v="caption" color={c.text2}>
        {s.publicData.regions[0]?.manifest.attribution ?? '© OpenStreetMap contributors (ODbL 1.0)'} · Record {inst.id}
      </T>
    </Screen>
  );
}

