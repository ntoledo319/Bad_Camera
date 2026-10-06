/** S19 Data & offline regions: every loaded region with source, freshness, size, refresh and delete. */
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, KV, Pill, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { fmtDate, bytesLabel } from '../../features/format';
import { BUNDLED_REGION_ID, OVERPASS_ENDPOINT, type RegionData } from '../../data/publicData';
import { log } from '../../platform/diagnostics';

type Msg = { kind: 'info' | 'caution' | 'error'; title: string; text: string } | null;

function freshness(r: RegionData) {
  const dated = r.installations.map((i) => i.lastObservedAt).filter(Boolean) as string[];
  const year = Date.now() - 365 * 864e5;
  const recent = dated.filter((d) => Date.parse(d) >= year).length;
  return `${recent} checked in person within a year · ${dated.length - recent} older · ${r.installations.length - dated.length} with no in-person date`;
}

function RegionCard({ r }: { r: RegionData }) {
  const s = useStore();
  const { c } = useTheme();
  const m = r.manifest;
  const bundled = m.id === BUNDLED_REGION_ID;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [confirm, setConfirm] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const refresh = async () => {
    setBusy(true);
    setMsg(null);
    abort.current = new AbortController();
    const res = await s.publicData.refresh(m.id, { signal: abort.current.signal });
    setBusy(false);
    s.bumpData();
    if (res.ok) setMsg({ kind: 'info', title: 'Data refreshed', text: `${res.added} added, ${res.updated} updated. ${res.missing} records were not in the new response and are flagged “not seen in latest refresh” — not marked removed.` });
    else {
      log('warn', 'data.refresh', res.error ?? 'failed');
      setMsg({ kind: 'error', title: 'Refresh failed', text: `${res.error}. The previous data is still in use and is labeled as possibly stale.` });
    }
  };

  const remove = async () => {
    await s.publicData.resetRegion(m.id);
    s.bumpData();
    setConfirm(false);
  };

  return (
    <Section title={m.name}>
      <Card>
        <View style={{ flexDirection: 'row', gap: SPACE.xs, marginBottom: SPACE.s, flexWrap: 'wrap' }}>
          <Pill label={m.status === 'current' ? 'Current' : m.status === 'refreshFailed' ? 'Refresh failed — showing last good data' : 'Possibly stale'} tone={m.status === 'current' ? 'primary' : 'caution'} />
          <Pill label={bundled ? 'Shipped with the app' : 'Downloaded by you'} />
        </View>
        <KV k="Records" v={String(r.installations.length)} />
        <KV k="Observation freshness" v={freshness(r)} />
        <KV k="Retrieved" v={fmtDate(m.fetchedAt, true)} />
        <KV k="Upstream snapshot" v={fmtDate(m.upstreamTimestamp, true)} />
        <KV k="Source" v={m.provider} />
        <KV k="Size" v={bytesLabel(m.bytes)} />
        <KV k="SHA-256" v={m.sha256} />
        <KV k="Bounding box" v={m.bbox.map((n) => n.toFixed(3)).join(', ')} />
        <KV k="License" v={m.attribution} />
        {m.lastError ? <KV k="Last error" v={m.lastError} /> : null}
        {msg ? <Banner kind={msg.kind} title={msg.title}>{msg.text}</Banner> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
          <Button kind="secondary" label={busy ? 'Refreshing…' : 'Refresh'} busy={busy} disabled={busy || s.settings.offlineOnly} onPress={refresh} />
          {busy ? <Button kind="ghost" label="Cancel" onPress={() => abort.current?.abort()} /> : null}
          {!busy && !confirm ? <Button kind="ghost" label={bundled ? 'Reset to shipped data…' : 'Delete…'} onPress={() => setConfirm(true)} /> : null}
        </View>
        {confirm ? (
          <View style={{ gap: SPACE.s }}>
            <Banner kind="caution" title={bundled ? 'Reset to shipped data?' : 'Delete this area?'}>
              {bundled ? 'Refreshed data is discarded and the extract shipped with the app is used again.' : 'Its mapped records are removed from this device.'} Your notebook, bookmarks and saved observations are not affected.
            </Banner>
            <View style={{ flexDirection: 'row', gap: SPACE.s }}>
              <Button label="Keep" kind="secondary" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
              <Button kind="danger" label={bundled ? 'Reset' : 'Delete'} onPress={remove} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}
        <T v="caption" color={c.text2}>
          {s.settings.offlineOnly ? 'Turn off offline-only mode to refresh.' : `Refresh sends one query for this area’s fixed bounding box to ${new URL(OVERPASS_ENDPOINT).hostname}. Your location is not sent.`}
        </T>
      </Card>
    </Section>
  );
}

export default function DataSettings() {
  const s = useStore();
  const { c } = useTheme();
  const regions = s.publicData.regions;
  return (
    <Screen scroll>
      <T v="title">Map data & sources</T>
      <T v="small" color={c.text2}>
        {`${regions.length} area${regions.length === 1 ? '' : 's'} on this device. To add another, pan the Explore map there and choose “Download camera data for this area”.`}
      </T>
      <Banner kind="info" title="Coverage is incomplete">
        This is a community-mapped dataset. Missing pins don’t mean no equipment; a pin doesn’t mean a device is active.
      </Banner>
      {regions.map((r) => (
        <RegionCard key={r.manifest.id} r={r} />
      ))}
      <Section title="Offline use">
        <Card>
          <T v="small">Camera records, the equipment guide, legal articles, your notebook and exports all work offline. The map background needs a connection; offline, the list and pins still work.</T>
        </Card>
      </Section>
    </Screen>
  );
}
