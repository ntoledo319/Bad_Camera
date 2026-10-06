/** User-attached source links: an add form and a read-only list. Links are stored as text, never fetched. */
import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { ExternalLink, Link2, Trash } from 'lucide-react-native';
import { useTheme } from '../design/theme';
import { Banner, Button, Card, Chip, Field, T } from '../design/ui';
import { SPACE } from '../design/tokens';
import { makeUserSource, USER_SOURCE_KIND_LABEL, type UserSourceKind } from '../domain/userSource';
import type { Source } from '../domain/schemas';

export function SourceLinkForm({ onAdd, onCancel }: { onAdd: (s: Source) => void | Promise<void>; onCancel?: () => void }) {
  const { c } = useTheme();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [section, setSection] = useState('');
  const [kind, setKind] = useState<UserSourceKind>('news');
  const [err, setErr] = useState<string | null>(null);

  const add = async () => {
    const r = makeUserSource({ title, url, kind, section });
    if (!r.ok) return setErr(r.message);
    setErr(null);
    await onAdd(r.source);
    setTitle('');
    setUrl('');
    setSection('');
  };

  return (
    <Card>
      <T v="heading">Add a source link</T>
      <T v="small" color={c.text2}>
        Sightline stores the link as you typed it. It does not open, download or verify the page.
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
        {(Object.keys(USER_SOURCE_KIND_LABEL) as UserSourceKind[]).map((k) => (
          <Chip key={k} label={USER_SOURCE_KIND_LABEL[k]} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>
      <Field label="Link" value={url} onChangeText={setUrl} placeholder="https://…" autoCapitalize="none" autoCorrect={false} keyboardType="url" error={err} />
      <Field label="Title (optional)" value={title} onChangeText={setTitle} placeholder="e.g. Town council minutes, March 2026" />
      <Field label="Page or section (optional)" value={section} onChangeText={setSection} placeholder="e.g. p. 14, item 7" />
      <View style={{ flexDirection: 'row', gap: SPACE.m }}>
        {onCancel && <Button label="Cancel" kind="secondary" onPress={onCancel} style={{ flex: 1 }} />}
        <Button label="Add link" icon={<Link2 size={18} color={c.onPrimary} />} onPress={add} style={{ flex: 1 }} />
      </View>
    </Card>
  );
}

export function SourceLinkList({ sources, onRemove }: { sources: Source[]; onRemove?: (id: string) => void }) {
  const { c } = useTheme();
  if (!sources.length) return null;
  return (
    <View style={{ gap: SPACE.s }}>
      {sources.map((src) => (
        <Card key={src.id}>
          <T v="body" style={{ fontWeight: '600' }}>
            {src.title}
          </T>
          <T v="small" color={c.text2}>
            {`${USER_SOURCE_KIND_LABEL[src.kind as UserSourceKind] ?? 'Source'} · ${src.publisher}${src.documentPageOrSection ? ` · ${src.documentPageOrSection}` : ''} · added by you, not verified`}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
            {src.url && <Button label="Open link" kind="ghost" icon={<ExternalLink size={18} color={c.primary} />} onPress={() => Linking.openURL(src.url!).catch(() => {})} />}
            {onRemove && <Button label="Remove" kind="ghost" icon={<Trash size={18} color={c.primary} />} onPress={() => onRemove(src.id)} />}
          </View>
        </Card>
      ))}
    </View>
  );
}

export function SourceLinkNote() {
  return <Banner kind="info">A link is a pointer, not a verified claim. Exports list it as a source you added.</Banner>;
}
