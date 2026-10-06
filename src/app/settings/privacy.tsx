/** Privacy details: truthful at-rest protection, what leaves the device, wipe. */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, KV, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { bytesLabel } from '../../features/format';

export default function Privacy() {
  const s = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof s.notebook.stats>> | null>(null);
  const [confirm, setConfirm] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    s.privateNotebook.stats().then(setStats).catch(() => {});
  }, [s.privateNotebook, s.rev]);
  return (
    <Screen scroll>
      <T v="title">Privacy details</T>
      <Section title="At-rest protection">
        <Card>
          <T v="small">{s.privateNotebook.kv.protection}</T>
        </Card>
      </Section>
      <Section title="Your notebook on this device">
        <Card>
          <KV k="Observations" v={stats ? String(stats.observations) : '…'} />
          <KV k="Revisions" v={stats ? String(stats.revisions) : '…'} />
          <KV k="Private photos" v={stats ? `${stats.media} (${bytesLabel(stats.mediaBytes)})` : '…'} />
          <KV k="Bookmarks" v={stats ? String(stats.bookmarks) : '…'} />
          <KV k="Collections" v={stats ? String(stats.collections) : '…'} />
        </Card>
      </Section>
      <Section title="What leaves the device">
        <Card>
          <T v="small">• Map tiles from OpenFreeMap when the map is visible (they see your IP and the area viewed). Off in offline-only mode.</T>
          <T v="small">• One Overpass API request when you tap “Refresh data”.</T>
          <T v="small">• Files you choose to share or save, via your device’s share menu.</T>
          <T v="small">• Links you choose to open in your browser.</T>
          <T v="small" style={{ marginTop: SPACE.s, fontWeight: '600' }}>Never: analytics, ads, crash reporting, accounts, photo uploads, or remote place search.</T>
        </Card>
      </Section>
      <Section title="Permissions">
        <Card>
          <T v="small">Location: only while using the app, when you ask. Camera: only when you tap “Take photo”. Photos: through the system picker, one selection at a time. Microphone: never requested.</T>
        </Card>
      </Section>
      {done ? <Banner kind="info" title="Done">{done}</Banner> : null}
      <Section title="Erase">
        {confirm === 0 ? (
          <Button kind="danger" label="Erase all notebook data…" onPress={() => setConfirm(1)} />
        ) : (
          <View style={{ gap: SPACE.s }}>
            <Banner kind="error" title="Erase everything?">
              All observations, revisions, private photos, bookmarks, collections, drafts and settings on this device will be deleted. Files you already shared are not affected. Consider an encrypted backup first.
            </Banner>
            <Button label="Keep my data" onPress={() => setConfirm(0)} />
            <Button kind="secondary" label="Make a backup first" onPress={() => router.push('/settings/backup')} />
            <Button
              kind="danger"
              label="Erase permanently"
              onPress={async () => {
                await s.privateNotebook.wipe();
                await s.updateSettings({ onboarded: false, demoMode: false, appLock: false });
                s.bump();
                setConfirm(0);
                setDone('Notebook erased from this device.');
              }}
            />
          </View>
        )}
      </Section>
      <T v="caption" style={{ color: c.text2, marginTop: SPACE.l }}>Deleting from the app removes data from app storage. Flash storage may retain fragments until overwritten; this is a device limitation.</T>
    </Screen>
  );
}
