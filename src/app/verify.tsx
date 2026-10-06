/** Verify an evidence ZIP locally: safe unzip, manifest schema, per-file SHA-256. Honest wording. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { ShieldCheck, ShieldX, FileQuestion } from 'lucide-react-native';
import { useTheme } from '../design/theme';
import { Banner, Button, Card, KV, Screen, Section, T } from '../design/ui';
import { SPACE } from '../design/tokens';
import { verifyEvidenceZip, VERIFY_EXPLANATION, type VerifyReport } from '../domain/evidence';
import { pickFile } from '../platform/files';
import { fmtDate } from '../features/format';

export default function Verify() {
  const { c } = useTheme();
  const [busy, setBusy] = useState(false);
  const [rep, setRep] = useState<{ name: string; r: VerifyReport } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const choose = async () => {
    setErr(null);
    setBusy(true);
    const f = await pickFile(200_000_000);
    if (f.status === 'ok') {
      await new Promise((r) => setTimeout(r, 0));
      setRep({ name: f.name, r: verifyEvidenceZip(f.bytes) });
    } else if (f.status === 'error') setErr(f.message);
    setBusy(false);
  };
  const r = rep?.r;
  const good = r?.status === 'match';
  return (
    <Screen scroll>
      <T v="title">Verify an evidence package</T>
      <T v="small" style={{ color: c.text2, marginTop: SPACE.xs }}>Checks a Sightline evidence ZIP on this device. The file is not uploaded or saved.</T>
      <Button label="Choose ZIP file…" busy={busy} disabled={busy} onPress={choose} style={{ marginTop: SPACE.l }} testID="verify-choose" />
      {err ? <View style={{ marginTop: SPACE.m }}><Banner kind="error" title="Could not open file">{err}</Banner></View> : null}
      {r && rep ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', gap: SPACE.m, alignItems: 'center' }}>
              {good ? <ShieldCheck size={32} color={c.primary} /> : r.status === 'mismatch' || r.status === 'unsafe' ? <ShieldX size={32} color={c.error} /> : <FileQuestion size={32} color={c.caution} />}
              <View style={{ flex: 1 }}>
                <T v="heading">{good ? 'File checksums match this manifest' : r.headline}</T>
                <T v="small" style={{ color: c.text2 }}>{rep.name}</T>
              </View>
            </View>
            {r.demonstration ? <View style={{ marginTop: SPACE.s }}><Banner kind="demo" title="Demonstration package">Generated from bundled demo data; not a real sighting.</Banner></View> : null}
          </Card>
          <Section title="Details">
            <Card>
              <KV k="Status" v={r.status} />
              <KV k="Files checked" v={String(r.checkedFiles)} />
              <KV k="ZIP SHA-256" v={r.zipSha256} />
              {r.manifest ? (
                <>
                  <KV k="Record" v={`${r.manifest.recordId} (rev ${r.manifest.recordRevision})`} />
                  <KV k="Exported" v={fmtDate(r.manifest.exportCreatedAt, true)} />
                  <KV k="Disclosure profile" v={r.manifest.selectedDisclosureProfile} />
                </>
              ) : null}
              {r.details.map((d) => (
                <T key={d} v="caption" style={{ marginTop: 4 }}>• {d}</T>
              ))}
            </Card>
          </Section>
          <Banner kind="info" title="What this does and doesn’t mean">{VERIFY_EXPLANATION}</Banner>
        </>
      ) : null}
    </Screen>
  );
}
