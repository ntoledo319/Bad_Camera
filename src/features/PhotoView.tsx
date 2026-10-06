/** Displays private photo bytes from the notebook (draft blob or saved attachment) without writing them anywhere else. */
import React, { useEffect, useState } from 'react';
import { Image, View, type ImageStyle, type StyleProp } from 'react-native';
import { bytesToBase64 } from './exportService';
import { useTheme } from '../design/theme';
import { T } from '../design/ui';

export function useDataUri(load: () => Promise<Uint8Array | null>, deps: unknown[]): { uri: string | null; error: string | null } {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUri(null);
    setError(null);
    load()
      .then((b) => alive && (b ? setUri(`data:image/jpeg;base64,${bytesToBase64(b)}`) : setError('Photo bytes missing')))
      .catch((e) => alive && setError((e as Error).message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { uri, error };
}

export function PhotoView({ load, deps, style, label, aspect = 4 / 3 }: { load: () => Promise<Uint8Array | null>; deps: unknown[]; style?: StyleProp<ImageStyle>; label: string; aspect?: number }) {
  const { c } = useTheme();
  const { uri, error } = useDataUri(load, deps);
  if (error)
    return (
      <View style={[{ aspectRatio: aspect, backgroundColor: c.errorBg, alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 8 }, style as object]}>
        <T v="small" color={c.error}>
          {error}
        </T>
      </View>
    );
  if (!uri) return <View style={[{ aspectRatio: aspect, backgroundColor: c.primarySoft, borderRadius: 12 }, style as object]} />;
  return <Image source={{ uri }} accessibilityLabel={label} style={[{ aspectRatio: aspect, borderRadius: 12, backgroundColor: c.primarySoft }, style]} resizeMode="contain" />;
}
