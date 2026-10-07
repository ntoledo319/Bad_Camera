/** S18 Records request builder: local draft only. Never sends; no invented officials/addresses/deadlines. */
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, View } from 'react-native';
import { Copy, Download, ExternalLink } from 'lucide-react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, Chip, Field, KV, Pill, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { buildRecordsRequest, RECORD_CATEGORIES, type RecordCategoryId, type RecordsRequestInput } from '../../domain/records';
import { copyText, saveBytes } from '../../platform/files';
import { RECORDS_LAWS, RECORDS_LAW_BY_CODE, RECORDS_LAWS_CHECKED_AT } from '../../../content/legal/recordsLaws';

const KEY = 'records-request';

export default function RecordsRequest() {
  const s = useStore();
  const { c } = useTheme();
  const [i, setI] = useState<RecordsRequestInput>({ agency: '', system: '', dateRange: '', categories: ['contracts', 'policies', 'locations'], feeLimit: '', signature: '', jurisdiction: 'CT' });
  const [note, setNote] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const [lawQuery, setLawQuery] = useState('');
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    s.privateNotebook.kv.get(`rr/${KEY}`).then((v) => v && setI({ ...i, ...JSON.parse(v) })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const t = setTimeout(() => s.privateNotebook.kv.commit([{ type: 'put', key: `rr/${KEY}`, value: JSON.stringify(i) }]).catch(() => {}), 400);
    return () => clearTimeout(t);
  }, [i, s.privateNotebook]);
  const out = useMemo(() => buildRecordsRequest(i), [i]);
  const set = (p: Partial<RecordsRequestInput>) => setI({ ...i, ...p });
  const toggleCat = (id: RecordCategoryId) => set({ categories: i.categories.includes(id) ? i.categories.filter((x) => x !== id) : [...i.categories, id] });
  const full = `Subject: ${out.subject}\n\n${out.body}`;
  const law = RECORDS_LAW_BY_CODE[i.jurisdiction];
  const q = lawQuery.trim().toLowerCase();
  const matches = q ? RECORDS_LAWS.filter((l) => l.jurisdiction.toLowerCase().includes(q) || l.code.toLowerCase() === q).slice(0, 10) : RECORDS_LAWS;

  return (
    <Screen scroll>
      <T v="small" style={{ color: c.text2, marginTop: SPACE.xs }}>Build a draft here, then send it yourself by email, portal or mail. Sightline never sends anything.</T>
      <Section title="Details">
        <Card>
          <T v="small" style={{ fontWeight: '600' }}>State law</T>
          {picking ? (
            <View style={{ gap: SPACE.s, marginTop: SPACE.s }}>
              <Field label="Find your state" placeholder="e.g. Ohio" value={lawQuery} onChangeText={setLawQuery} autoFocus autoCorrect={false} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
                {matches.map((l) => (
                  <Chip
                    key={l.code}
                    label={l.jurisdiction}
                    selected={i.jurisdiction === l.code}
                    onPress={() => {
                      set({ jurisdiction: l.code });
                      setPicking(false);
                      setLawQuery('');
                    }}
                  />
                ))}
                <Chip label="No citation (generic)" selected={i.jurisdiction === 'generic'} onPress={() => (set({ jurisdiction: 'generic' }), setPicking(false))} />
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.s, marginTop: SPACE.s, flexWrap: 'wrap' }}>
              <Pill label={law ? law.jurisdiction : 'No citation (generic)'} tone="primary" />
              <Button kind="ghost" label="Change state" onPress={() => setPicking(true)} />
            </View>
          )}
          {law && !picking ? (
            <View style={{ gap: SPACE.xs, marginTop: SPACE.s }}>
              <KV k="Law" v={law.lawName} />
              <KV k="Citation" v={law.citation} />
              <KV k="Response time in the law" v={law.responseTime ?? 'No fixed deadline found in the text we read (often “promptly” or “reasonable time”)'} />
              {law.notes ? <T v="caption" color={c.text2}>{law.notes}</T> : null}
              {!law.verified ? <T v="caption" color={c.caution}>This citation could not be confirmed against the official text (the site blocked automated access). Check it before sending.</T> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
                <Button kind="ghost" label="Read the law" icon={<ExternalLink size={18} color={c.primary} />} onPress={() => Linking.openURL(law.officialUrl).catch(() => {})} />
                {law.guideUrl ? <Button kind="ghost" label="Official guide" icon={<ExternalLink size={18} color={c.primary} />} onPress={() => Linking.openURL(law.guideUrl!).catch(() => {})} /> : null}
              </View>
              <T v="caption" color={c.text2}>{`Researched ${RECORDS_LAWS_CHECKED_AT}. Laws change; confirm with the agency or official guide.`}</T>
            </View>
          ) : null}
          <View style={{ gap: SPACE.m, marginTop: SPACE.m }}>
            <Field label="Agency" placeholder="e.g. Town of Fairfield Police Department" value={i.agency} onChangeText={(v) => set({ agency: v })} hint="Check the agency’s own website for its records contact." />
            <Field label="System or program" placeholder="e.g. automated license plate reader program" value={i.system} onChangeText={(v) => set({ system: v })} />
            <Field label="Date range" placeholder="e.g. January 1, 2023 to present" value={i.dateRange} onChangeText={(v) => set({ dateRange: v })} />
            <Field label="Contact me before fees exceed" placeholder="e.g. $25" value={i.feeLimit} onChangeText={(v) => set({ feeLimit: v })} />
            <Field label="Signature (optional until sending)" placeholder="Your name and contact" value={i.signature} onChangeText={(v) => set({ signature: v })} hint="Stored only on this device." />
          </View>
          <T v="small" style={{ fontWeight: '600', marginTop: SPACE.m }}>Records to ask for</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s, marginTop: SPACE.s }}>
            {RECORD_CATEGORIES.map((rc) => (
              <Chip key={rc.id} label={rc.label} selected={i.categories.includes(rc.id)} onPress={() => toggleCat(rc.id)} />
            ))}
          </View>
        </Card>
      </Section>
      {out.missing.length ? (
        <Banner kind="caution" title="Still to fill in">
          {`${out.missing.join(', ')} — shown as [brackets] in the draft.`}
        </Banner>
      ) : null}
      <Section title="Draft">
        <Card>
          <T v="small" style={{ fontWeight: '600' }} selectable>Subject: {out.subject}</T>
          <T v="small" selectable style={{ marginTop: SPACE.s, fontFamily: undefined }}>{out.body}</T>
        </Card>
      </Section>
      {note ? <Banner kind={note.kind} title={note.kind === 'info' ? 'Done' : 'Problem'}>{note.text}</Banner> : null}
      <View style={{ gap: SPACE.s, marginTop: SPACE.l }}>
        <Button label="Copy draft" icon={<Copy size={20} color={c.onPrimary} />} onPress={async () => setNote((await copyText(full)) ? { kind: 'info', text: 'Draft copied. Paste it into your email or the agency’s portal.' } : { kind: 'error', text: 'Clipboard unavailable — select the text above.' })} />
        <Button
          kind="secondary"
          label="Save as text file"
          icon={<Download size={20} color={c.primary} />}
          onPress={async () => {
            const o = await saveBytes('records-request-draft.txt', new TextEncoder().encode(full), 'text/plain');
            setNote({ kind: o.status === 'Export saved' || o.status === 'Share sheet opened' ? 'info' : 'error', text: `${o.status}. ${o.detail}` });
          }}
        />
      </View>
      <T v="caption" style={{ color: c.text2, marginTop: SPACE.l }}>Sending a request doesn’t guarantee disclosure. Exemptions, redactions and fees may apply. Not legal advice.</T>
    </Screen>
  );
}
