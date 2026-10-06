import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Map, ScanSearch, NotebookPen, BookOpen } from 'lucide-react-native';
import { useTheme } from '../../design/theme';
import { useStore } from '../../data/store';
import { SettingsGear } from '../../features/SettingsGear';

export default function TabsLayout() {
  const { c } = useTheme();
  const s = useStore();
  if (!s.settings.onboarded) return <Redirect href="/welcome" />;
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.canvas },
        headerTitleStyle: { color: c.text, fontWeight: '700', fontSize: 22 },
        headerShadowVisible: false,
        headerRight: () => <SettingsGear />,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.text2,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 60 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: c.canvas },
      }}
    >
      <Tabs.Screen name="explore" options={{ title: 'Explore', headerShown: false, tabBarIcon: ({ color }) => <Map size={24} color={color} /> }} />
      <Tabs.Screen name="identify" options={{ title: 'Identify', tabBarIcon: ({ color }) => <ScanSearch size={24} color={color} /> }} />
      <Tabs.Screen name="notebook" options={{ title: 'Notebook', tabBarIcon: ({ color }) => <NotebookPen size={24} color={color} /> }} />
      <Tabs.Screen name="learn" options={{ title: 'Learn', tabBarIcon: ({ color }) => <BookOpen size={24} color={color} /> }} />
    </Tabs>
  );
}
