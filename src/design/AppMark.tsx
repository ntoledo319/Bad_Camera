import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { WORDMARK_PATH } from '../domain/card';

/** Original Sightline mark: a viewpoint/lens ring with an open notch and a centre pupil. */
export function AppMark({ size = 32, color }: { size?: number; color: string }) {
  return (
    <View aria-hidden>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path d={WORDMARK_PATH} fill={color} fillRule="evenodd" />
      </Svg>
    </View>
  );
}
