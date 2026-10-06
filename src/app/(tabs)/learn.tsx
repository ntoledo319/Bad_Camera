/** S16 Learn: rights, equipment guide, records requests, methodology. All bundled; works offline. */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Scale, FileText, Microscope, GitCompare, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../design/theme';
import { Card, Chip, Empty, Field, Row, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { CATALOG } from '../../../content/catalog/catalog';
import { CATEGORY_LABEL } from '../../domain/projection';
import { CategoryIcon } from '../../features/CategoryIcon';
import { fmtDate } from '../../features/format';
import { LEGAL_CHECKED_AT } from '../../../content/legal/legal';
import type { Category } from '../../domain/schemas';

const CATS: (Category | 'all')[] = ['all', 'alpr', 'video', 'enforcement', 'acoustic', 'unknown'];

export default function Learn() {
  const { c } = useTheme();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'all'>('all');
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return CATALOG.filter((e) => (cat === 'all' || e.category === cat) && (!n || [e.familyLabel, e.manufacturer, ...e.currentLabels, ...e.legacyAliases, e.summary].join(' ').toLowerCase().includes(n)));
  }, [q, cat]);

  return (
    <Screen scroll>
      <T v="title">Learn</T>
      <T v="small" style={{ color: c.text2, marginTop: SPACE.xs }}>
        Plain-language guides. Not legal advice. Sources checked {fmtDate(LEGAL_CHECKED_AT)}.
      </T>
      <View style={{ gap: SPACE.s, marginTop: SPACE.l }}>
        <Card onPress={() => router.push('/learn/rights')}>
          <View style={{ flexDirection: 'row', gap: SPACE.m, alignItems: 'center' }}>
            <Scale size={28} color={c.primary} />
            <View style={{ flex: 1 }}>
              <T v="heading">Your rights when documenting</T>
              <T v="small" style={{ color: c.text2 }}>U.S. overview + Connecticut 2026 changes, with citations.</T>
            </View>
            <ChevronRight size={20} color={c.text2} />
          </View>
        </Card>
        <Card onPress={() => router.push('/learn/records-request')}>
          <View style={{ flexDirection: 'row', gap: SPACE.m, alignItems: 'center' }}>
            <FileText size={28} color={c.primary} />
            <View style={{ flex: 1 }}>
              <T v="heading">Ask an agency for records</T>
              <T v="small" style={{ color: c.text2 }}>Build a public-records request draft. Nothing is sent.</T>
            </View>
            <ChevronRight size={20} color={c.text2} />
          </View>
        </Card>
        <Card onPress={() => router.push('/learn/methodology')}>
          <View style={{ flexDirection: 'row', gap: SPACE.m, alignItems: 'center' }}>
            <Microscope size={28} color={c.primary} />
            <View style={{ flex: 1 }}>
              <T v="heading">How Sightline knows what it shows</T>
              <T v="small" style={{ color: c.text2 }}>Data sources, distance math, checksums and limits.</T>
            </View>
            <ChevronRight size={20} color={c.text2} />
          </View>
        </Card>
      </View>

      <Section title="Equipment guide" action={<Chip label="Compare" onPress={() => router.push('/compare')} />}>
        <Field label="Search the guide" placeholder="Brand, product, old name (e.g. Falcon)" value={q} onChangeText={setQ} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s, marginTop: SPACE.s }}>
          {CATS.map((k) => (
            <Chip key={k} label={k === 'all' ? 'All' : CATEGORY_LABEL[k]} selected={cat === k} onPress={() => setCat(k)} />
          ))}
        </View>
        {list.length === 0 ? (
          <Empty title="Nothing found" body="Try another name. Older product names (like Falcon or Condor) are searchable too." />
        ) : (
          list.map((e) => (
            <Row key={e.id} left={<CategoryIcon category={e.category} size={22} />} title={e.familyLabel} subtitle={`${e.manufacturer} · ${CATEGORY_LABEL[e.category]}${e.legacyAliases.length ? ` · formerly ${e.legacyAliases.slice(0, 2).join(', ')}` : ''}`} onPress={() => router.push({ pathname: '/catalog/[id]', params: { id: e.id } })} right={<ChevronRight size={18} color={c.text2} />} />
          ))
        )}
        <View style={{ flexDirection: 'row', gap: SPACE.s, alignItems: 'center', marginTop: SPACE.s }}>
          <GitCompare size={16} color={c.text2} />
          <T v="caption" style={{ color: c.text2, flex: 1 }}>Product pages establish what a vendor markets — not what is installed at any specific location.</T>
        </View>
      </Section>
    </Screen>
  );
}
