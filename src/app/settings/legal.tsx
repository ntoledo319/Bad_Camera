/** Privacy policy and terms of use — same text as the data website (content/legal/policies.ts). */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../design/theme';
import { Card, Screen, Section, Segmented, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { POLICY_EFFECTIVE, PRIVACY_POLICY, TERMS_OF_USE } from '../../../content/legal/policies';

export default function LegalDocs() {
  const { c } = useTheme();
  const [which, setWhich] = useState<'privacy' | 'terms'>('privacy');
  const doc = which === 'privacy' ? PRIVACY_POLICY : TERMS_OF_USE;
  return (
    <Screen scroll>
      <Segmented label="Document" options={[{ key: 'privacy', label: 'Privacy policy' }, { key: 'terms', label: 'Terms of use' }]} value={which} onChange={setWhich} />
      <T v="caption" color={c.text2} style={{ marginTop: SPACE.m }}>{`Effective ${POLICY_EFFECTIVE}`}</T>
      {doc.summary ? (
        <Card style={{ marginTop: SPACE.s }}>
          <T style={{ fontWeight: '600' }}>{doc.summary}</T>
        </Card>
      ) : null}
      {doc.sections.map((sec) => (
        <Section key={sec.title} title={sec.title}>
          <View style={{ gap: SPACE.s }}>
            {(sec.paragraphs ?? []).map((p) => (
              <T key={p} v="small" selectable>
                {p}
              </T>
            ))}
            {(sec.bullets ?? []).map((b) => (
              <View key={b} style={{ flexDirection: 'row', gap: SPACE.s }}>
                <T v="small" aria-hidden>•</T>
                <T v="small" selectable style={{ flex: 1 }}>
                  {b}
                </T>
              </View>
            ))}
          </View>
        </Section>
      ))}
    </Screen>
  );
}
