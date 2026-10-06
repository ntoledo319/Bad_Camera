import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { WORDMARK_PATH } from '../domain/card';

/** Original Sightline mark: a viewpoint/lens ring with an open notch and a centre pupil. */
export function AppMark({ size = 32, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={WORDMARK_PATH} fill={color} fillRule="evenodd" />
    </Svg>
  );
}
