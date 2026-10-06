import React from 'react';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useTheme } from '../design/theme';
import { IconButton } from '../design/ui';

export function SettingsGear() {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <IconButton label="Settings" onPress={() => router.push('/settings')} style={{ marginRight: 12 }}>
      <Settings size={22} color={c.primary} />
    </IconButton>
  );
}

