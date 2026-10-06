/** Methodology: data provenance, distance algorithm, checksums, limitations. */
import React from 'react';
import { useRouter } from 'expo-router';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Button, Card, KV, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { METHODOLOGY_TEXT } from '../../domain/report';
import { LIMITATIONS } from '../../domain/projection';
import { ALGORITHM } from '../../domain/distance';
import { VERIFY_EXPLANATION } from '../../domain/evidence';
import { fmtDate } from '../../features/format';

export default function Methodology() {
  const s = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const m = s.publicData.regions[0]?.manifest;
  return (
    <Screen scroll>
      <T v="title">How Sightline knows what it shows</T>
      <Section title="Principles">
        <Card>
          {METHODOLOGY_TEXT.map((p) => (
            <T key={p.slice(0, 24)} v="small" style={{ marginBottom: SPACE.s }}>{p}</T>
          ))}
        </Card>
      </Section>
      <Section title="Map data in this build">
        <Card>
          <KV k="Region" v={m?.name ?? '—'} />
          <KV k="Records" v={m ? String(m.recordCount) : '—'} />
          <KV k="Retrieved" v={fmtDate(m?.fetchedAt, true)} />
          <KV k="Upstream snapshot" v={fmtDate(m?.upstreamTimestamp, true)} />
          <KV k="Normalization" v={m?.normalizationVersion ?? '—'} />
          <KV k="Attribution" v={m?.attribution ?? '—'} />
        </Card>
      </Section>
      <Section title="Distance">
        <Card>
          <T v="small">Straight-line distance between two coordinates ({ALGORITHM}). It is not walking distance and doesn’t mean a camera can see you. Displayed values are rounded, and the uncertainty of both points is shown alongside.</T>
        </Card>
      </Section>
      <Section title="Checksums">
        <Card>
          <T v="small">{VERIFY_EXPLANATION}</T>
        </Card>
      </Section>
      <Section title="Limitations">
        <Card>
          {LIMITATIONS.map((l) => (
            <T key={l} v="small">• {l}</T>
          ))}
        </Card>
      </Section>
      <T v="caption" style={{ color: c.text2, marginTop: SPACE.l }}>No analytics, no ads, no account. Network use happens only when you load map tiles or choose to refresh data.</T>
      <Button kind="ghost" label="Data & sources settings" onPress={() => router.push('/settings/data')} style={{ marginTop: SPACE.s }} />
    </Screen>
  );
}
