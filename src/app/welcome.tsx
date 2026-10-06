/** S01 Welcome — no permission prompt on launch, no account path. */
import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';
import { MapPin, LocateFixed } from 'lucide-react-native';
import { useStore } from '../data/store';
import { useTheme } from '../design/theme';
import { Banner, Button, Screen, T } from '../design/ui';
import { AppMark } from '../design/AppMark';
import { requestFix } from '../platform/location';
import { SPACE } from '../design/tokens';

function Illustration({ color, soft }: { color: string; soft: string }) {
  return (
    <View aria-hidden>
    <Svg width="100%" height={150} viewBox="0 0 320 150">
      <Path d="M10 130 C80 110 120 140 180 118 S280 100 310 112" stroke={soft} strokeWidth={10} fill="none" strokeLinecap="round" />
      <Path d="M70 128V46" stroke={color} strokeWidth={3} strokeLinecap="round" />
      <Path d="M70 54h26v14H74" stroke={color} strokeWidth={3} fill="none" strokeLinejoin="round" />
      <Circle cx={90} cy={61} r={3} stroke={color} strokeWidth={2.5} fill="none" />
      <Path d="M230 120c0-22 14-36 14-52a14 14 0 1 0-28 0c0 16 14 30 14 52z" stroke={color} strokeWidth={3} fill="none" />
      <Circle cx={230} cy={68} r={5} stroke={color} strokeWidth={2.5} fill="none" />
      <Path d="M150 40h44v52h-44z" stroke={color} strokeWidth={3} fill="none" strokeLinejoin="round" />
      <Path d="M158 54h28M158 64h28M158 74h18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
    </View>
  );
}

export default function Welcome() {
  const s = useStore();
  const { c } = useTheme();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const finish = async (demo = false) => {
    await s.updateSettings({ onboarded: true, demoMode: demo });
    router.replace('/explore');
  };

  return (
    <Screen>
      <View style={{ gap: SPACE.m, paddingTop: SPACE.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.s }}>
          <AppMark size={36} color={c.primary} />
          <T v="title">Sightline</T>
        </View>
        <T v="display">Know what is watching. Keep the evidence.</T>
        <Illustration color={c.primary} soft={c.primarySoft} />
        <T>Explore public records. Save your observations privately. Share only what you choose.</T>
        <T v="small" color={c.text2}>
          No account. Your notebook stays on this device. Map tiles and camera-data refreshes come from online providers, which can see your network requests — Sightline does not promise total anonymity.
        </T>
      </View>
      {msg && <Banner kind="caution">{msg}</Banner>}
      <View style={{ gap: SPACE.m }}>
        <Button label="Explore a place" icon={<MapPin size={20} color={c.onPrimary} />} onPress={() => finish(false)} testID="welcome-explore" />
        <Button
          label="Use my location"
          kind="secondary"
          busy={busy}
          icon={<LocateFixed size={20} color={c.primary} />}
          onPress={async () => {
            setBusy(true);
            const r = await requestFix();
            setBusy(false);
            if (r.ok) {
              s.setReference(r.ref);
              await finish(false);
            } else {
              setMsg(r.reason === 'denied' ? r.message : `${r.message} You can still explore by searching a place or entering coordinates.`);
            }
          }}
        />
        <Pressable accessibilityRole="link" onPress={() => finish(true)} style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center' }}>
          <T color={c.primary} style={{ textDecorationLine: 'underline' }}>
            Try a clearly labeled demo
          </T>
        </Pressable>
      </View>
    </Screen>
  );
}
