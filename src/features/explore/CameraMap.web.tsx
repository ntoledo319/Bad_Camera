/** Browser preview map: MapLibre GL JS with the same style, data and layers as native. */
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { View } from 'react-native';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { STYLE_DARK, STYLE_LIGHT, offlineStyle, pinColorExpr, pinGlyphExpr, toGeoJSON, type MapViewProps } from './mapShared';

// Metro can't bundle MapLibre's module worker; it is copied to public/ (tools/web/copy-maplibre-worker.mjs).
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

export function CameraMap(p: MapViewProps) {
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const latest = useRef(p);
  useLayoutEffect(() => {
    latest.current = p;
  });
  const styleKey = p.offline ? 'offline' : p.dark ? 'dark' : 'light';

  useEffect(() => {
    if (!host.current) return;
    const m = new maplibregl.Map({
      container: host.current,
      style: (p.offline ? offlineStyle(p.palette.canvas) : p.dark ? STYLE_DARK : STYLE_LIGHT) as never,
      center: [p.center.lon, p.center.lat],
      zoom: p.center.zoom,
      // Attribution is rendered by Explore as a caption above the sheets (always visible, never behind the tab bar).
      attributionControl: false,
    });
    // Compass only, top-left, clear of the recenter/filter buttons; pinch/scroll handles zoom.
    m.addControl(new maplibregl.NavigationControl({ showZoom: false, showCompass: true, visualizePitch: false }), 'top-left');
    map.current = m;
    const addLayers = () => {
      const c = latest.current.palette;
      if (m.getSource('installations')) return;
      m.addSource('installations', { type: 'geojson', data: toGeoJSON(latest.current.installations, latest.current.selectedId) as never, cluster: true, clusterRadius: 44, clusterMaxZoom: 14 });
      m.addSource('marks', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'clusters', type: 'circle', source: 'installations', filter: ['has', 'point_count'], paint: { 'circle-color': c.surface, 'circle-stroke-color': c.primary, 'circle-stroke-width': 2, 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26] } });
      const glyphs = !!(m.getStyle() as { glyphs?: string }).glyphs;
      if (glyphs) m.addLayer({ id: 'cluster-count', type: 'symbol', source: 'installations', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13, 'text-font': ['Noto Sans Bold'] }, paint: { 'text-color': c.text } });
      m.addLayer({ id: 'pins', type: 'circle', source: 'installations', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': pinColorExpr(c) as never, 'circle-radius': ['case', ['==', ['get', 'selected'], 1], 12, 9], 'circle-stroke-color': ['case', ['==', ['get', 'selected'], 1], c.text, c.surface], 'circle-stroke-width': ['case', ['==', ['get', 'selected'], 1], 3, 1.5] } });
      if (glyphs) m.addLayer({ id: 'pin-glyph', type: 'symbol', source: 'installations', filter: ['!', ['has', 'point_count']], layout: { 'text-field': pinGlyphExpr as never, 'text-size': 11, 'text-font': ['Noto Sans Bold'], 'text-allow-overlap': true }, paint: { 'text-color': '#FFFFFF' } });
      m.addLayer({ id: 'mark-ref', type: 'circle', source: 'marks', filter: ['==', ['get', 'kind'], 'reference'], paint: { 'circle-color': '#FFFFFF', 'circle-radius': 8, 'circle-stroke-color': '#2B59C3', 'circle-stroke-width': 4 } });
      m.addLayer({ id: 'mark-placed', type: 'circle', source: 'marks', filter: ['==', ['get', 'kind'], 'placed'], paint: { 'circle-color': c.mapPinUnknown, 'circle-radius': 11, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 3 } });
      syncMarks();
    };
    const syncMarks = () => {
      const q = latest.current;
      const feats = [
        ...(q.reference ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [q.reference.lon, q.reference.lat] }, properties: { kind: 'reference' } }] : []),
        ...(q.observer ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [q.observer.lon, q.observer.lat] }, properties: { kind: 'reference' } }] : []),
        ...(q.placed ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [q.placed.lon, q.placed.lat] }, properties: { kind: 'placed' } }] : []),
      ];
      (m.getSource('marks') as maplibregl.GeoJSONSource | undefined)?.setData({ type: 'FeatureCollection', features: feats } as never);
    };
    (m as unknown as { __syncMarks: () => void }).__syncMarks = syncMarks;
    m.on('load', addLayers);
    m.on('styledata', () => m.isStyleLoaded() && addLayers());
    m.on('click', (e: maplibregl.MapMouseEvent) => {
      const q = latest.current;
      if (q.onPlace) return q.onPlace({ lat: e.lngLat.lat, lon: e.lngLat.lng });
      const f = m.queryRenderedFeatures(e.point, { layers: ['pins', 'clusters'].filter((l) => m.getLayer(l)) })[0];
      if (!f) return q.onSelect(null);
      if (f.properties?.cluster) return m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: m.getZoom() + 2, duration: 200 });
      q.onSelect(String(f.properties?.id));
    });
    m.on('mouseenter', 'pins', () => (m.getCanvas().style.cursor = 'pointer'));
    m.on('mouseleave', 'pins', () => (m.getCanvas().style.cursor = ''));
    const emit = () => {
      const b = m.getBounds();
      const c = m.getCenter();
      latest.current.onRegion([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], { lat: c.lat, lon: c.lng, zoom: m.getZoom() });
    };
    m.on('moveend', emit);
    m.once('load', emit);
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey]);

  useEffect(() => {
    (map.current?.getSource('installations') as maplibregl.GeoJSONSource | undefined)?.setData(toGeoJSON(p.installations, p.selectedId) as never);
  }, [p.installations, p.selectedId]);
  useEffect(() => {
    (map.current as unknown as { __syncMarks?: () => void })?.__syncMarks?.();
  }, [p.reference, p.placed, p.observer]);
  useEffect(() => {
    if (p.centerNonce > 0) map.current?.easeTo({ center: [p.center.lon, p.center.lat], zoom: p.center.zoom, duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.centerNonce]);

  return (
    <View style={{ flex: 1 }}>
      <div ref={host} style={{ position: 'absolute', inset: 0 }} aria-label="Map of mapped records. Use the List view for an accessible equivalent." role="region" />
    </View>
  );
}
