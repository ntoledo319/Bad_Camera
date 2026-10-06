import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme, useWindowDimensions } from 'react-native';
import { LIGHT, DARK, SIZE, type Palette } from './tokens';

export interface Theme {
  c: Palette;
  dark: boolean;
  gutter: number;
  reduceMotion: boolean;
}

const Ctx = createContext<Theme>({ c: LIGHT, dark: false, gutter: SIZE.gutter, reduceMotion: false });

export function ThemeProvider({ mode, children }: { mode: 'system' | 'light' | 'dark'; children: React.ReactNode }) {
  const scheme = useColorScheme();
  const { width } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);
  const dark = mode === 'dark' || (mode === 'system' && scheme === 'dark');
  const value = useMemo(() => ({ c: dark ? DARK : LIGHT, dark, gutter: width < 360 ? SIZE.gutterNarrow : SIZE.gutter, reduceMotion }), [dark, width, reduceMotion]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
