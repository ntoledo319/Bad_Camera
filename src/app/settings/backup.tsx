/** S20 Encrypted backup: scrypt + XChaCha20-Poly1305, passphrase never stored. Restore with header preview and conflict-safe merge. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, Field, KV, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { createBackup, openBackup, readBackupHeader, passphraseProblem, BackupError, type BackupHeader } from '../../domain/backup';
import { saveBytes, pickFile } from '../../platform/files';
import { fmtDate } from '../../features/format';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export default function Backup() {
  const s = useStore();
  const { c } = useTheme();
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  type Msg = { kind: 'info' | 'caution' | 'error'; title: string; text: string } | null;
  // Messages appear beside the action that produced them, so they are never scrolled out of view.
  const [msg, setMsg] = useState<Msg>(null);
  const [restoreMsg, setRestoreMsg] = useState<Msg>(null);
  const [file, setFile] = useState<{ name: string; bytes: Uint8Array; header: BackupHeader } | null>(null);
  const [rp, setRp] = useState('');
  const nb = s.privateNotebook;
  const problem = p1 ? passphraseProblem(p1) : null;
  const mismatch = p2 && p1 !== p2 ? 'Passphrases don’t match.' : null;

  const make = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const st = await nb.stats();
      const data = await nb.exportForBackup();
      const bytes = await createBackup(data, p1, { observations: st.observations, media: st.media, bookmarks: st.bookmarks, collections: st.collections });
      const o = await saveBytes(`sightline-backup-${new Date().toISOString().slice(0, 10)}.sightline-backup`, bytes, 'application/octet-stream');
      setMsg({ kind: o.status === 'Export saved' || o.status === 'Share sheet opened' ? 'info' : o.status === 'Canceled' ? 'caution' : 'error', title: o.status, text: `${o.detail} Keep the passphrase somewhere safe — without it the backup cannot be opened by anyone, including us.` });
      setP1('');
      setP2('');
    } catch (e) {
      setMsg({ kind: 'error', title: 'Backup failed', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const choose = async () => {
    setRestoreMsg(null);
    const f = await pickFile(500_000_000);
    if (f.status === 'canceled') return;
    if (f.status === 'error') return setRestoreMsg({ kind: 'error', title: 'Could not open file', text: f.message });
    try {
      const { header } = readBackupHeader(f.bytes);
      setFile({ name: f.name, bytes: f.bytes, header });
    } catch (e) {
      setRestoreMsg({ kind: 'error', title: 'Not a Sightline backup', text: (e as Error).message });
    }
  };

  const restore = async () => {
    if (!file) return;
    setBusy(true);
    setRestoreMsg(null);
    try {
      const { contents } = await openBackup(file.bytes, rp);
      const r = await nb.restore(contents);
      s.bump();
      setRestoreMsg({ kind: 'info', title: 'Restore complete', text: `${r.added} added, ${r.skipped} identical items skipped, ${r.keptBoth} conflicting items kept as copies. Nothing existing was overwritten.` });
      setFile(null);
      setRp('');
    } catch (e) {
      const wrong = e instanceof BackupError && e.code === 'wrong_passphrase_or_corrupt';
      setRestoreMsg({ kind: 'error', title: wrong ? 'Wrong passphrase or damaged file' : 'Restore failed', text: wrong ? 'Nothing was changed. Check the passphrase and try again.' : `${(e as Error).message}. Nothing was changed.` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <T v="title">Encrypted backup</T>
      <T v="small" style={{ color: c.text2, marginTop: SPACE.xs }}>A single file containing your private notebook and photos, encrypted with your passphrase (scrypt + XChaCha20-Poly1305). Nothing is uploaded; you choose where to save it.</T>
      <Section title="Create backup">
        <Card>
          <View style={{ gap: SPACE.m }}>
            <Field label="Passphrase" secureTextEntry value={p1} onChangeText={setP1} error={problem} hint="At least 10 characters. A few random words work well." autoCapitalize="none" autoCorrect={false} />
            <Field label="Repeat passphrase" secureTextEntry value={p2} onChangeText={setP2} error={mismatch} autoCapitalize="none" autoCorrect={false} />
          </View>
          <Button label="Create encrypted backup" busy={busy} disabled={busy || !p1 || !!problem || p1 !== p2} onPress={make} style={{ marginTop: SPACE.m }} />
          <T v="caption" style={{ color: c.text2, marginTop: SPACE.s }}>Lost passphrase = unrecoverable backup. There is no reset.</T>
          {msg ? <View style={{ marginTop: SPACE.m }}><Banner kind={msg.kind} title={msg.title}>{msg.text}</Banner></View> : null}
        </Card>
      </Section>
      <Section title="Restore">
        <Card>
          {restoreMsg ? <View style={{ marginBottom: SPACE.m }}><Banner kind={restoreMsg.kind} title={restoreMsg.title}>{restoreMsg.text}</Banner></View> : null}
          {!file ? (
            <Button kind="secondary" label="Choose backup file…" onPress={choose} />
          ) : (
            <>
              <T v="small" style={{ fontWeight: '600' }}>{file.name}</T>
              <KV k="Created" v={fmtDate(file.header.createdAt, true)} />
              <KV k="Contains" v={[plural(file.header.counts.observations, 'observation'), plural(file.header.counts.media, 'photo'), plural(file.header.counts.bookmarks, 'bookmark'), plural(file.header.counts.collections, 'collection')].join(', ')} />
              <KV k="Format" v={`v${file.header.v} · ${file.header.kdf.name} · ${file.header.aead.name}`} />
              <Field label="Backup passphrase" secureTextEntry value={rp} onChangeText={setRp} autoCapitalize="none" autoCorrect={false} />
              <T v="caption" style={{ color: c.text2, marginTop: SPACE.s }}>Restoring merges into your notebook. Existing records are never overwritten; conflicting copies are kept side by side.</T>
              <View style={{ flexDirection: 'row', gap: SPACE.s, marginTop: SPACE.m }}>
                <Button label="Restore" busy={busy} disabled={busy || !rp} onPress={restore} style={{ flex: 1 }} />
                <Button kind="ghost" label="Cancel" onPress={() => (setFile(null), setRp(''))} style={{ flex: 1 }} />
              </View>
            </>
          )}
        </Card>
      </Section>
    </Screen>
  );
}
