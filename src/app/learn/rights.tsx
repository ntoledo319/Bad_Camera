/** S17 Rights: U.S. overview + Connecticut supplement. Expandable sections, citations, last-checked date. Not legal advice. */
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, Copy } from 'lucide-react-native';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, Pill, Screen, Section, Segmented, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { LEGAL_ARTICLES } from '../../../content/legal/legal';
import { SOURCE_BY_ID } from '../../../content/sources';
import { fmtDate } from '../../features/format';
import { copyText } from '../../platform/files';

export default function Rights() {
  const { c } = useTheme();
  const router = useRouter();
  const [which, setWhich] = useState(LEGAL_ARTICLES[0].id);
  const [open, setOpen] = useState<Record<string, boolean>>({ 'public-observation': true });
  const [note, setNote] = useState<string | null>(null);
  const a = LEGAL_ARTICLES.find((x) => x.id === which)!;
  const share = async () => {
    const text = `${a.title}\n\n${a.lead}\n\n${a.sections.map((s) => `${s.title}\n${s.body}`).join('\n\n')}\n\nSources:\n${a.sourceIds.map((id) => `[${id}] ${SOURCE_BY_ID[id]?.title} — ${SOURCE_BY_ID[id]?.url}`).join('\n')}\n\nInformation only; not legal advice. Sources checked ${fmtDate(a.sourceCheckedAt)}.`;
    setNote((await copyText(text)) ? 'Article text with citations copied.' : 'Clipboard unavailable.');
  };
  return (
    <Screen scroll>
      <Segmented label="Jurisdiction" options={LEGAL_ARTICLES.map((x) => ({ key: x.id, label: x.jurisdiction }))} value={which} onChange={setWhich} />
      <T v="title" style={{ marginTop: SPACE.l }}>{a.title}</T>
      <T v="small" style={{ color: c.text2, marginTop: SPACE.xs }}>{a.subtitle}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs, marginTop: SPACE.s }}>
        <Pill label={`Sources checked ${fmtDate(a.sourceCheckedAt)}`} />
        <Pill label={a.reviewStatus === 'attorney_reviewed' ? 'Attorney-reviewed' : 'Not attorney-reviewed'} tone="caution" />
      </View>
      <View style={{ marginTop: SPACE.m }}>
        <Banner kind="info" title="Information, not legal advice">
          Laws vary by place and change. For a specific situation, talk to a lawyer in your area.
        </Banner>
      </View>
      <T style={{ marginTop: SPACE.m }}>{a.lead}</T>
      <View style={{ gap: SPACE.s, marginTop: SPACE.l }}>
        {a.sections.map((s) => {
          const isOpen = !!open[s.id];
          return (
            <Card key={s.id}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpen({ ...open, [s.id]: !isOpen })} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.s, minHeight: 44 }}>
                <T v="heading" style={{ flex: 1 }}>{s.title}</T>
                {isOpen ? <ChevronUp size={20} color={c.text2} /> : <ChevronDown size={20} color={c.text2} />}
              </Pressable>
              {isOpen ? (
                <>
                  <T v="small" style={{ marginTop: SPACE.s }}>{s.body}</T>
                  {s.sourceIds.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s, marginTop: SPACE.s }}>
                      {s.sourceIds.map((id) => (
                        <Button key={id} kind="ghost" label={`[${id}] ${SOURCE_BY_ID[id]?.publisher ?? id}`} onPress={() => router.push({ pathname: '/sources/[id]', params: { id } })} />
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}
            </Card>
          );
        })}
      </View>
      <Section title="Effective dates">
        <Card>
          <T v="small">{a.effectiveDateNotes}</T>
          <T v="caption" style={{ color: c.text2, marginTop: SPACE.s }}>{a.validationStatus}</T>
        </Card>
      </Section>
      {note ? <Banner kind="info" title="Done">{note}</Banner> : null}
      <View style={{ gap: SPACE.s, marginTop: SPACE.l }}>
        <Button kind="secondary" label="Copy article with citations" icon={<Copy size={18} color={c.primary} />} onPress={share} />
        <Button kind="ghost" label="Draft a public-records request" onPress={() => router.push('/learn/records-request')} />
      </View>
    </Screen>
  );
}
