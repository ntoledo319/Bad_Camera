/** Native map: @maplibre/maplibre-react-native v11. */
import React, { useEffect, useMemo, useRef } from 'react';
import { Map, Camera, GeoJSONSource, Layer, type CameraRef } from '@maplibre/maplibre-react-native';
import { STYLE_DARK, STYLE_LIGHT, offlineStyle, pinColorExpr, pinGlyphExpr, toGeoJSON, type MapViewProps } from './mapShared';

export function CameraMap(p: MapViewProps) {
  const cam = useRef<CameraRef>(null);
  const data = useMemo(() => toGeoJSON(p.installations, p.selectedId), [p.installations, p.selectedId]);
  const style = p.offline ? offlineStyle(p.palette.canvas) : p.dark ? STYLE_DARK : STYLE_LIGHT;
  useEffect(() => {
    if (p.centerNonce > 0) cam.current?.easeTo({ center: [p.center.lon, p.center.lat], zoom: p.center.zoom, duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.centerNonce]);
  const marks = {
    type: 'FeatureCollection' as const,
    features: [
      ...(p.reference ? [{ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [p.reference.lon, p.reference.lat] }, properties: { kind: 'reference' } }] : []),
      ...(p.observer ? [{ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [p.observer.lon, p.observer.lat] }, properties: { kind: 'reference' } }] : []),
      ...(p.placed ? [{ type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [p.placed.lon, p.placed.lat] }, properties: { kind: 'placed' } }] : []),
    ],
  };
  return (
    <Map
      style={{ flex: 1 }}
      mapStyle={style as never}
      attribution
      logo={false}
      compass
      compassPosition={{ top: 140, right: 12 } as never}
      attributionPosition={{ bottom: 8, left: 8 } as never}
      onPress={(e) => {
        const ll = e.nativeEvent.lngLat;
        if (p.onPlace) p.onPlace({ lat: ll[1], lon: ll[0] });
        else p.onSelect(null);
      }}
      onRegionDidChange={(e) => {
        const v = e.nativeEvent;
        const b = v.bounds as unknown as [number, number, number, number];
        p.onRegion(b, { lat: v.center[1], lon: v.center[0], zoom: v.zoom });
      }}
    >
      <Camera ref={cam} initialViewState={{ center: [p.center.lon, p.center.lat], zoom: p.center.zoom }} />
      <GeoJSONSource
        id="installations"
        data={data as never}
        cluster
        clusterRadius={44}
        clusterMaxZoom={14}
        onPress={(e) => {
          const f = e.nativeEvent.features?.[0];
          const id = f?.properties?.id as string | undefined;
          if (id && !p.onPlace) p.onSelect(id);
          if (f?.properties?.cluster) {
            const [lon, lat] = (f.geometry as GeoJSON.Point).coordinates;
            cam.current?.easeTo({ center: [lon, lat], zoom: p.center.zoom + 2, duration: 200 });
          }
        }}
      >
        <Layer id="clusters" type="circle" filter={['has', 'point_count']} paint={{ 'circle-color': p.palette.surface, 'circle-stroke-color': p.palette.primary, 'circle-stroke-width': 2, 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26] as never }} />
        <Layer id="cluster-count" type="symbol" filter={['has', 'point_count']} layout={{ 'text-field': ['get', 'point_count_abbreviated'] as never, 'text-size': 13, 'text-font': ['Noto Sans Bold'] }} paint={{ 'text-color': p.palette.text }} />
        <Layer id="pins" type="circle" filter={['!', ['has', 'point_count']] as never} paint={{ 'circle-color': pinColorExpr(p.palette) as never, 'circle-radius': ['case', ['==', ['get', 'selected'], 1], 12, 9] as never, 'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], p.palette.text, p.palette.surface] as never, 'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 3, 1.5] as never }} />
        <Layer id="pin-glyph" type="symbol" filter={['!', ['has', 'point_count']] as never} layout={{ 'text-field': pinGlyphExpr as never, 'text-size': 11, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true }} paint={{ 'text-color': '#FFFFFF' }} />
      </GeoJSONSource>
      <GeoJSONSource id="marks" data={marks as never}>
        <Layer id="mark-ref" type="circle" filter={['==', ['get', 'kind'], 'reference'] as never} paint={{ 'circle-color': '#FFFFFF', 'circle-radius': 8, 'circle-stroke-color': '#2B59C3', 'circle-stroke-width': 4 }} />
        <Layer id="mark-placed" type="circle" filter={['==', ['get', 'kind'], 'placed'] as never} paint={{ 'circle-color': p.palette.mapPinUnknown, 'circle-radius': 11, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 }} />
      </GeoJSONSource>
    </Map>
  );
}
