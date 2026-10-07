import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '../design/theme';
import { AppStoreProvider, useStore } from '../data/store';
import { Banner, Button, IconButton, Loading, Screen, T } from '../design/ui';
import { AppMark } from '../design/AppMark';
import { sweepExports } from '../platform/files';
import { unlock } from '../platform/auth';
import { log } from '../platform/diagnostics';
import { House, Lock } from 'lucide-react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** Shown instead of a back arrow when a screen was opened directly (link, reload) and has no history. */
function HomeButton() {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <IconButton label="Go to Explore" onPress={() => router.replace('/explore')} style={{ marginLeft: 4, marginRight: 8 }}>
      <House size={20} color={c.primary} />
    </IconButton>
  );
}

function LockGate({ children }: { children: React.ReactNode }) {
  const s = useStore();
  const { c } = useTheme();
  const [msg, setMsg] = React.useState<string | null>(null);
  if (!s.settings.appLock || !s.locked) return <>{children}</>;
  return (
    <Screen scroll={false} style={{ justifyContent: 'center', alignItems: 'center' }}>
      <AppMark size={64} color={c.primary} />
      <T v="title" center>
        Sightline is locked
      </T>
      <T v="small" color={c.text2} center>
        App lock uses this device’s own authentication. It is not an account.
      </T>
      {msg && <Banner kind="caution">{msg}</Banner>}
      <Button
        label="Unlock"
        icon={<Lock size={20} color={c.onPrimary} />}
        onPress={async () => {
          const r = await unlock();
          if (r.ok) s.setLocked(false);
          else setMsg(r.message ?? 'Could not unlock.');
        }}
      />
    </Screen>
  );
}

function Shell() {
  const s = useStore();
  const { c, dark } = useTheme();
  useEffect(() => {
    if (s.ready) {
      SplashScreen.hideAsync().catch(() => {});
      try {
        const n = sweepExports();
        if (n) log('info', 'exports', `Removed ${n} expired temporary export file(s).`);
      } catch (e) {
        log('warn', 'exports', (e as Error).message);
      }
    }
  }, [s.ready]);
  if (!s.ready) return <Loading label="Opening your notebook…" />;
  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {s.error && (
        <View style={{ padding: 12 }}>
          <Banner kind="error" title="Local storage problem">
            {`Sightline could not open its local storage: ${s.error}. Public records still work; saving is unavailable until this is resolved.`}
          </Banner>
        </View>
      )}
      <LockGate>
        <Stack
          screenOptions={{
            headerLeft: ({ canGoBack }) => (canGoBack ? undefined : <HomeButton />),
            headerStyle: { backgroundColor: c.canvas },
            headerTintColor: c.primary,
            headerTitleStyle: { color: c.text, fontWeight: '600' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: c.canvas },
            headerBackButtonDisplayMode: 'minimal',
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="camera/[id]" options={{ title: 'Mapped record' }} />
          <Stack.Screen name="observation/new" options={{ title: 'New observation' }} />
          <Stack.Screen name="observation/[id]" options={{ title: 'Observation' }} />
          <Stack.Screen name="observation/redact" options={{ title: 'Review photo' }} />
          <Stack.Screen name="share/[recordId]" options={{ title: 'Share studio' }} />
          <Stack.Screen name="catalog/[id]" options={{ title: 'Equipment guide' }} />
          <Stack.Screen name="compare" options={{ title: 'Compare' }} />
          <Stack.Screen name="sources/[id]" options={{ title: 'Source' }} />
          <Stack.Screen name="collections/[id]" options={{ title: 'Collection' }} />
          <Stack.Screen name="learn/rights" options={{ title: 'Your rights' }} />
          <Stack.Screen name="learn/methodology" options={{ title: 'Sources & accuracy' }} />
          <Stack.Screen name="learn/records-request" options={{ title: 'Public-records request' }} />
          <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
          <Stack.Screen name="settings/privacy" options={{ title: 'Privacy' }} />
          <Stack.Screen name="settings/data" options={{ title: 'Camera data & offline' }} />
          <Stack.Screen name="settings/backup" options={{ title: 'Backup & restore' }} />
          <Stack.Screen name="settings/licenses" options={{ title: 'Licenses' }} />
          <Stack.Screen name="settings/diagnostics" options={{ title: 'Diagnostics' }} />
          <Stack.Screen name="settings/legal" options={{ title: 'Privacy policy & terms' }} />
          <Stack.Screen name="verify" options={{ title: 'Verify evidence package' }} />
        </Stack>
      </LockGate>
    </View>
  );
}

function Themed() {
  const s = useStore();
  return (
    <ThemeProvider mode={s.settings.theme}>
      <Shell />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <Themed />
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
