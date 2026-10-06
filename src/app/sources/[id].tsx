/** S13 Source detail: what a source is, what it can support, retrieval/version, license, external link (confirmed). */
import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ExternalLink, Copy } from 'lucide-react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, Empty, KV, Pill, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { SOURCE_BY_ID } from '../../../content/sources';
import { fmtDate } from '../../features/format';
import { copyText } from '../../platform/files';
import type { Source } from '../../domain/schemas';

const KIND: Record<Source['kind'], string> = {
  officialRecord: 'Official record',
  communityMap: 'Community map',
  manufacturer: 'Manufacturer material',
  news: 'News report',
  userPhoto: 'Your own photo',
  other: 'Other publication',
};
const SCOPE: Record<Source['scope'], string> = {
  installation: 'Can support claims about a specific installation.',
  agency: 'Agency-level: can support claims about an agency’s programs, not the exact position of any device.',
  productFamily: 'Product-level: establishes what a vendor markets, not what is installed anywhere.',
  legal: 'Legal text or commentary. Information only, not legal advice.',
  methodology: 'Methodology or licensing reference.',
};

export default function SourceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const src = s.source(String(id)) ?? SOURCE_BY_ID[String(id)];
  if (!src)
    return (
      <Screen>
        <Empty title="Source not found" body="It may have been removed by a data refresh." action={<Button label="Back" onPress={() => router.back()} />} />
      </Screen>
    );
  const claims = s.allClaims.filter((cl) => cl.sourceId === src.id);
  return (
    <Screen scroll>
      <Stack.Screen options={{ title: 'Source' }} />
      <T v="title">{src.title}</T>
      <View style={{ flexDirection: 'row', gap: SPACE.xs, flexWrap: 'wrap', marginTop: SPACE.s }}>
        <Pill label={KIND[src.kind]} tone="primary" />
        <Pill label={src.availability === 'available' ? 'Link checked' : src.availability === 'notChecked' ? 'Link not checked' : src.availability === 'unavailable' ? 'Link unavailable' : 'Availability unknown'} tone={src.availability === 'unavailable' ? 'caution' : 'neutral'} />
      </View>
      <Section title="What this source can support">
        <Card>
          <T v="small">{SCOPE[src.scope]}</T>
        </Card>
      </Section>
      <Section title="Details">
        <Card>
          <KV k="Publisher" v={src.publisher || 'Not stated'} />
          <KV k="Published" v={src.publishedAt ? fmtDate(src.publishedAt) : 'Not stated'} />
          <KV k="Retrieved" v={fmtDate(src.accessedAt)} />
          <KV k="Retrieval method" v={src.retrievalMethod || 'Not stated'} />
          {src.sourceRecordId ? <KV k="Record ID" v={src.sourceRecordId} /> : null}
          {src.sourceVersion ? <KV k="Version" v={src.sourceVersion} /> : null}
          {src.documentPageOrSection ? <KV k="Section" v={src.documentPageOrSection} /> : null}
          {src.snapshotSha256 ? <KV k="Snapshot SHA-256" v={src.snapshotSha256} /> : null}
          <KV k="License" v={src.licenseId ?? 'Not an open license — cite, don’t copy'} />
          <KV k="Attribution" v={src.attribution || '—'} />
          <KV k="Source ID" v={src.id} />
        </Card>
      </Section>
      {claims.length ? (
        <Section title={`Claims citing this source (${claims.length})`}>
          <Card>
            {claims.slice(0, 20).map((cl) => (
              <T key={cl.id} v="small">
                • {cl.fieldPath}: {String(cl.value)} <T v="caption" style={{ color: c.text2 }}>({cl.status})</T>
              </T>
            ))}
            {claims.length > 20 ? <T v="caption" style={{ color: c.text2 }}>…and {claims.length - 20} more.</T> : null}
          </Card>
        </Section>
      ) : null}
      {note ? (
        <View style={{ marginTop: SPACE.m }}>
          <Banner kind="info" title="Done">{note}</Banner>
        </View>
      ) : null}
      {src.url ? (
        <View style={{ gap: SPACE.s, marginTop: SPACE.l }}>
          {confirm ? (
            <Banner kind="caution" title="Leave Sightline?">
              This opens {new URL(src.url).hostname} in your browser. That site will see your IP address and may set cookies.
            </Banner>
          ) : null}
          <Button label={confirm ? 'Open in browser' : 'Open source page'} icon={<ExternalLink size={20} color={c.onPrimary} />} onPress={() => (confirm ? (Linking.openURL(src.url!).catch(() => setNote('Could not open a browser.')), setConfirm(false)) : setConfirm(true))} />
          <Button kind="ghost" label="Copy link" icon={<Copy size={18} color={c.primary} />} onPress={async () => setNote((await copyText(src.url!)) ? 'Link copied.' : 'Clipboard unavailable.')} />
        </View>
      ) : (
        <T v="small" style={{ color: c.text2, marginTop: SPACE.l }}>No public link for this source.</T>
      )}
    </Screen>
  );
}
