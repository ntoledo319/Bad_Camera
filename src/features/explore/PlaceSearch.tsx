/** Place search (bundled offline index) + manual coordinate entry. No remote geocoding by default. */
import React, { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchPlaces, PLACES, type Place } from '../../../content/places/places';
import { isValidCoord } from '../../domain/distance';
import { useTheme } from '../../design/theme';
import { Banner, Button, Field, Row, Section, T, Toggle } from '../../design/ui';
import { SPACE } from '../../design/tokens';

export function parseCoords(s: string): { lat: number; lon: number } | null {
  const m = s.trim().match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const p = { lat: Number(m[1]), lon: Number(m[2]) };
  return isValidCoord(p) ? p : null;
}

export function PlaceSearch({ visible, onClose, onPlace, onCoords }: { visible: boolean; onClose: () => void; onPlace: (p: Place) => void; onCoords: (p: { lat: number; lon: number }, asReference: boolean) => void }) {
  const { c, gutter } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [coord, setCoord] = useState('');
  const [asRef, setAsRef] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const results = q ? searchPlaces(q) : PLACES.slice(0, 6);
  const submitCoords = () => {
    const p = parseCoords(coord);
    if (!p) return setErr('Enter latitude and longitude in decimal degrees, e.g. 41.1412, -73.2637');
    onCoords(p, asRef);
  };
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: c.canvas }} contentContainerStyle={{ paddingTop: insets.top + SPACE.l, paddingBottom: insets.bottom + SPACE.xxl, paddingHorizontal: gutter, gap: SPACE.l }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T v="title">Find a place</T>
          <Button label="Close" kind="ghost" onPress={onClose} />
        </View>
        <Field label="Place name" placeholder="e.g. Fairfield, Southport" value={q} onChangeText={setQ} autoFocus autoCorrect={false} returnKeyType="search" hint="Searches a small place list bundled in the app. Nothing is sent online." />
        <Section title={q ? 'Matches' : 'Suggested places'}>
          {results.length === 0 && <T color={c.text2}>No bundled place matches. Try coordinates below.</T>}
          {results.map((p) => (
            <Row key={p.id} title={p.name} subtitle={p.context} onPress={() => onPlace(p)} />
          ))}
        </Section>
        <Section title="Coordinates">
          <Field
            label="Latitude, longitude"
            placeholder="41.1412, -73.2637"
            value={coord}
            onChangeText={(t) => {
              setCoord(t);
              setErr(null);
            }}
            keyboardType="numbers-and-punctuation"
            returnKeyType="go"
            onSubmitEditing={submitCoords}
            error={err}
          />
          <Toggle label="Use as my reference point for distances" hint="Distances will read “from chosen point”." value={asRef} onChange={setAsRef} />
          <Button
            label="Go to coordinates"
            kind="secondary"
            onPress={submitCoords}
          />
        </Section>
        <Banner kind="info">Place coordinates are approximate area centres for navigation only.</Banner>
      </ScrollView>
    </Modal>
  );
}
