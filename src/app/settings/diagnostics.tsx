/** Local-only diagnostics log (scrubbed of coordinates, hashes, URIs, emails). Export is user-initiated. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, Empty, KV, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { entries, clearDiagnostics } from '../../platform/diagnostics';
import { saveBytes } from '../../platform/files';
import Constants from 'expo-constants';

export default function Diagnostics() {
  const s = useStore();
  const { c } = useTheme();
  const [list, setList] = useState(entries());
  const [msg, setMsg] = useState<string | null>(null);
  const text = () =>
    [`Sightline ${Constants.expoConfig?.version ?? ''} · ${s.platform} · storage: ${s.privateNotebook.kv.name}`, ...list.map((e) => `${e.at} ${e.level.toUpperCase()} [${e.area}] ${e.message}`)].join('\n');
  return (
    <Screen scroll>
      <T v="title">Diagnostics</T>
      <T v="small" style={{ color: c.text2, marginTop: SPACE.xs }}>Kept in memory only, cleared on restart. Coordinates, hashes, file paths and emails are scrubbed. Nothing is sent anywhere.</T>
      <Section title="Environment">
        <Card>
          <KV k="Platform" v={s.platform} />
          <KV k="Storage" v={s.privateNotebook.kv.name} />
          <KV k="Map records" v={String(s.installations.length)} />
          <KV k="Demo mode" v={s.settings.demoMode ? 'On' : 'Off'} />
        </Card>
      </Section>
      <Section title={`Log (${list.length})`}>
        {list.length === 0 ? (
          <Empty title="No entries" body="Warnings and errors will appear here." />
        ) : (
          <Card>
            {list.slice(-50).reverse().map((e, i) => (
              <T key={i} v="caption" style={{ color: e.level === 'error' ? c.error : c.text, marginBottom: 4 }}>
                {e.at.slice(11, 19)} {e.level} [{e.area}] {e.message}
              </T>
            ))}
          </Card>
        )}
      </Section>
      {msg ? <Banner kind="info" title="Status">{msg}</Banner> : null}
      <View style={{ gap: SPACE.s, marginTop: SPACE.l }}>
        <Button kind="secondary" label="Save log as text file" onPress={async () => { const o = await saveBytes('sightline-diagnostics.txt', new TextEncoder().encode(text()), 'text/plain'); setMsg(`${o.status}. ${o.detail}`); }} />
        <Button kind="ghost" label="Clear log" onPress={() => (clearDiagnostics(), setList([]))} />
      </View>
    </Screen>
  );
}
