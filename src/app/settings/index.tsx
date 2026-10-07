/** S21 Settings home. No account, no analytics. */
import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Shield, Database, Archive, FileText, Activity, FlaskConical, Scale } from 'lucide-react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Card, Row, Screen, Section, Segmented, T, Toggle } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { authAvailable, unlock } from '../../platform/auth';
import Constants from 'expo-constants';

export default function SettingsHome() {
  const s = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const st = s.settings;
  const [msg, setMsg] = useState<string | null>(null);
  const chev = <ChevronRight size={18} color={c.text2} />;

  const setLock = async (v: boolean) => {
    if (v) {
      const a = await authAvailable();
      if (!a.ok) return setMsg(a.reason ?? 'Device authentication unavailable.');
      const u = await unlock();
      if (!u.ok) return setMsg(u.message ?? 'Not enabled.');
    }
    setMsg(null);
    await s.updateSettings({ appLock: v });
  };

  return (
    <Screen scroll>
      <Section title="Appearance">
        <Card>
          <T v="small" style={{ color: c.text2, marginBottom: SPACE.xs }}>Theme</T>
          <Segmented label="Theme" options={[{ key: 'system', label: 'System' }, { key: 'light', label: 'Light' }, { key: 'dark', label: 'Dark' }]} value={st.theme} onChange={(k) => s.updateSettings({ theme: k })} />
          <T v="small" style={{ color: c.text2, marginTop: SPACE.m, marginBottom: SPACE.xs }}>Units</T>
          <Segmented label="Units" options={[{ key: 'imperial', label: 'Feet & miles' }, { key: 'metric', label: 'Meters & km' }]} value={st.units} onChange={(k) => s.updateSettings({ units: k })} />
          <Toggle label="Haptic feedback" value={st.haptics} onChange={(v) => s.updateSettings({ haptics: v })} />
        </Card>
      </Section>
      <Section title="Privacy & location">
        <Card>
          <T v="small" style={{ color: c.text2, marginBottom: SPACE.xs }}>Location</T>
          <Segmented label="Location behavior" options={[{ key: 'ask_each_time', label: 'Only when I tap' }, { key: 'use_when_exploring', label: 'While exploring' }]} value={st.locationBehavior} onChange={(k) => s.updateSettings({ locationBehavior: k })} />
          <Toggle label="App lock" hint={s.platform === 'web' ? 'Available in the phone app.' : 'Require Face ID / fingerprint / passcode to open your notebook.'} value={st.appLock} onChange={setLock} />
          <Toggle label="Offline-only mode" hint="No network at all: no map tiles, no refresh. Bundled data still works." value={st.offlineOnly} onChange={(v) => s.updateSettings({ offlineOnly: v })} />
          {msg ? <Banner kind="caution" title="App lock not enabled">{msg}</Banner> : null}
        </Card>
        <Row left={<Shield size={22} color={c.primary} />} title="Privacy details" subtitle="What is stored, where, and how it’s protected" onPress={() => router.push('/settings/privacy')} right={chev} />
      </Section>
      <Section title="Data">
        <Row left={<Database size={22} color={c.primary} />} title="Map data & sources" subtitle="Region, freshness, refresh, reset" onPress={() => router.push('/settings/data')} right={chev} />
        <Row left={<Archive size={22} color={c.primary} />} title="Encrypted backup" subtitle="Create or restore a passphrase-protected backup" onPress={() => router.push('/settings/backup')} right={chev} />
      </Section>
      <Section title="Demo">
        <Card>
          <Toggle label="Demo mode" hint="Shows one clearly labeled demonstration record in a separate notebook. Your real records are hidden, not changed." value={st.demoMode} onChange={(v) => (s.updateSettings({ demoMode: v }), s.bump())} />
          <View style={{ flexDirection: 'row', gap: SPACE.s, alignItems: 'center', marginTop: SPACE.xs }}>
            <FlaskConical size={16} color={c.text2} />
            <T v="caption" style={{ color: c.text2, flex: 1 }}>Demo exports are watermarked “DEMONSTRATION — NOT A REAL SIGHTING”.</T>
          </View>
        </Card>
      </Section>
      <Section title="About">
        <Row left={<Scale size={22} color={c.primary} />} title="Privacy policy & terms" subtitle="What Sightline collects (nothing) and the rules of use" onPress={() => router.push('/settings/legal')} right={chev} />
        <Row left={<FileText size={22} color={c.primary} />} title="Licenses & attribution" onPress={() => router.push('/settings/licenses')} right={chev} />
        <Row left={<Activity size={22} color={c.primary} />} title="Diagnostics" subtitle="Local-only log you can choose to export" onPress={() => router.push('/settings/diagnostics')} right={chev} />
        <Row title="Verify an evidence package" onPress={() => router.push('/verify')} right={chev} />
      </Section>
      <T v="caption" style={{ color: c.text2, marginTop: SPACE.l }}>Sightline {Constants.expoConfig?.version ?? '0.1.0'} · No account · No analytics · No ads</T>
    </Screen>
  );
}
