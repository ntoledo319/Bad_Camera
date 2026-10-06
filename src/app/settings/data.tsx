/** S19 Data & sources: region manifest, freshness, user-triggered refresh, reset. */
import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, KV, Pill, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { fmtDate, bytesLabel } from '../../features/format';
import { OVERPASS_ENDPOINT } from '../../data/publicData';
import { log } from '../../platform/diagnostics';

export default function DataSettings() {
  const s = useStore();
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'info' | 'caution' | 'error'; title: string; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const r = s.publicData.regions[0];
  const m = r?.manifest;

  const refresh = async () => {
    if (!m) return;
    setBusy(true);
    setMsg(null);
    abort.current = new AbortController();
    const res = await s.publicData.refresh(m.id, fetch, abort.current.signal);
    setBusy(false);
    s.bumpData();
    if (res.ok) setMsg({ kind: 'info', title: 'Data refreshed', text: `${res.added} added, ${res.updated} updated. ${res.missing} records were not in the new response and are flagged “not seen in latest refresh” — not marked removed.` });
    else {
      log('warn', 'data.refresh', res.error ?? 'failed');
      setMsg({ kind: 'error', title: 'Refresh failed', text: `${res.error}. The previous data is still in use and is labeled as possibly stale.` });
    }
  };

  if (!m) return <Screen><T>No region loaded.</T></Screen>;
  return (
    <Screen scroll>
      <T v="title">Map data & sources</T>
      <Section title={m.name}>
        <Card>
          <View style={{ flexDirection: 'row', gap: SPACE.xs, marginBottom: SPACE.s, flexWrap: 'wrap' }}>
            <Pill label={m.status === 'current' ? 'Current' : m.status === 'refreshFailed' ? 'Refresh failed — showing last good data' : m.status} tone={m.status === 'current' ? 'primary' : 'caution'} />
            {s.settings.offlineOnly ? <Pill label="Offline-only mode" /> : null}
          </View>
          <KV k="Records" v={String(r.installations.length)} />
          <KV k="Retrieved" v={fmtDate(m.fetchedAt, true)} />
          <KV k="Upstream snapshot" v={fmtDate(m.upstreamTimestamp, true)} />
          <KV k="Size" v={bytesLabel(m.bytes)} />
          <KV k="SHA-256" v={m.sha256} />
          <KV k="Bounding box" v={m.bbox.map((n) => n.toFixed(3)).join(', ')} />
          <KV k="Normalization" v={m.normalizationVersion} />
          <KV k="License" v={m.attribution} />
          {m.lastError ? <KV k="Last error" v={m.lastError} /> : null}
        </Card>
      </Section>
      <Banner kind="info" title="Coverage is incomplete">
        This is a community-mapped dataset. Missing pins don’t mean no equipment; a pin doesn’t mean a device is active.
      </Banner>
      {msg ? <View style={{ marginTop: SPACE.m }}><Banner kind={msg.kind} title={msg.title}>{msg.text}</Banner></View> : null}
      <View style={{ gap: SPACE.s, marginTop: SPACE.l }}>
        <Button label={busy ? 'Refreshing…' : 'Refresh data'} busy={busy} disabled={busy || s.settings.offlineOnly} onPress={refresh} />
        {busy ? <Button kind="ghost" label="Cancel refresh" onPress={() => abort.current?.abort()} /> : null}
        <T v="caption" style={{ color: c.text2 }}>
          {s.settings.offlineOnly ? 'Turn off offline-only mode to refresh.' : `Sends one query for this area to ${new URL(OVERPASS_ENDPOINT).hostname}. Your location is not sent — only the region’s fixed bounding box.`}
        </T>
        {confirmReset ? (
          <>
            <Banner kind="caution" title="Reset to bundled data?">Refreshed data is discarded and the extract shipped with the app is used again. Your notebook is not affected.</Banner>
            <Button label="Keep current data" onPress={() => setConfirmReset(false)} />
            <Button kind="danger" label="Reset" onPress={async () => (await s.publicData.resetRegion(m.id), s.bumpData(), setConfirmReset(false), setMsg({ kind: 'info', title: 'Reset', text: 'Using the bundled extract.' }))} />
          </>
        ) : (
          <Button kind="secondary" label="Reset to bundled data…" onPress={() => setConfirmReset(true)} />
        )}
      </View>
    </Screen>
  );
}
