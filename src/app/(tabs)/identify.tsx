/** S06 Identify: entry to the observation flow. Works offline; no photo leaves the device. */
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Camera, ImagePlus, ListChecks, BookOpen, WifiOff } from 'lucide-react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Card, DemoBanner, Screen, Section, T } from '../../design/ui';
import { SPACE } from '../../design/tokens';
import { CAMERA_SUPPORTED } from '../../platform/photos';
import { PHOTO_AI_ENABLED } from '../../domain/identify';

export default function Identify() {
  const router = useRouter();
  const s = useStore();
  const { c } = useTheme();
  return (
    <Screen scroll>
      {s.settings.demoMode ? <DemoBanner /> : null}
      <T v="title">Identify equipment</T>
      <T style={{ color: c.text2, marginTop: SPACE.xs }}>
        Record what you can see from where you lawfully stand. You choose the type; the app suggests possible families from visible features and explains why. It never claims an exact model without a readable label or document.
      </T>

      <View style={{ gap: SPACE.m, marginTop: SPACE.l }}>
        {CAMERA_SUPPORTED ? (
          <Button label="Take photo" icon={<Camera size={20} color={c.onPrimary} />} onPress={() => router.push({ pathname: '/observation/new', params: { start: 'camera' } })} testID="identify-take" />
        ) : (
          <Banner kind="info" title="Camera capture is available in the phone app">
            The browser preview can import a photo file instead.
          </Banner>
        )}
        <Button kind={CAMERA_SUPPORTED ? 'secondary' : 'primary'} label="Import photo" icon={<ImagePlus size={20} color={CAMERA_SUPPORTED ? c.primary : c.onPrimary} />} onPress={() => router.push({ pathname: '/observation/new', params: { start: 'import' } })} testID="identify-import" />
        <Button kind="secondary" label="Identify without a photo" icon={<ListChecks size={20} color={c.primary} />} onPress={() => router.push({ pathname: '/observation/new', params: { mode: 'nophoto' } })} testID="identify-nophoto" />
        <Button kind="ghost" label="Browse the equipment guide" icon={<BookOpen size={20} color={c.primary} />} onPress={() => router.push('/learn')} />
      </View>

      <Section title="How identification works">
        <Card>
          <T v="body">1. Add photos (optional, up to 12). Originals stay private in your notebook.</T>
          <T v="body" style={{ marginTop: SPACE.s }}>2. Pick a category, or leave it as “unknown”.</T>
          <T v="body" style={{ marginTop: SPACE.s }}>3. Tick visible features. You’ll see possible families with “why this may match” and “what would tell them apart”.</T>
          <T v="body" style={{ marginTop: SPACE.s }}>4. Place the equipment on the map and save. Every save is a hash-chained revision.</T>
        </Card>
      </Section>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.s, marginTop: SPACE.l }}>
        <WifiOff size={16} color={c.text2} />
        <T v="caption" style={{ color: c.text2, flex: 1 }}>
          Works offline. {PHOTO_AI_ENABLED ? '' : 'No automated photo recognition is used: photos are never uploaded for analysis.'}
        </T>
      </View>
    </Screen>
  );
}
