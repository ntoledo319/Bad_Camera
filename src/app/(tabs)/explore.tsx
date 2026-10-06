/** S02 Explore map + S03 list + S05 collapsed detail sheet. */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, List, Map as MapIcon, LocateFixed, SlidersHorizontal, X, Bookmark, BookmarkCheck, NotebookPen, Share2, Info, RefreshCw } from 'lucide-react-native';
import { useStore } from '../../data/store';
import { useTheme } from '../../design/theme';
import { Banner, Button, Chip, DemoBanner, IconButton, Pill, T } from '../../design/ui';
import { RADIUS, SPACE } from '../../design/tokens';
import { CameraMap } from '../../features/explore/CameraMap';
import { OSM_MAP_ATTRIBUTION } from '../../features/explore/mapShared';
import { FiltersSheet } from '../../features/explore/FiltersSheet';
import { PlaceSearch } from '../../features/explore/PlaceSearch';
import { SettingsGear } from '../../features/SettingsGear';
import { CategoryIcon } from '../../features/CategoryIcon';
import { applyFilters, activeFilterCount, CHIP_FILTERS, inBbox, sortByDistance } from '../../domain/filters';
import { distanceFor, installationTitle, observedLabel, placeLabelOf, sourceBadge, fmtDate } from '../../features/format';
import { requestFix } from '../../platform/location';
import { shareBytes, copyText } from '../../platform/files';
import type { CameraInstallation } from '../../domain/schemas';
import { utf8ToBytes } from '../../domain/hash';

type Sort = 'distance' | 'observed' | 'updated' | 'name';
const DEFAULT_CENTER = { lat: 41.1612, lon: -73.2537, zoom: 12.2 };

export default function Explore() {
  const s = useStore();
  const { c, dark, gutter } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [view, setView] = useState<'map' | 'list'>('map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [center, setCenter] = useState(s.reference ? { lat: s.reference.lat, lon: s.reference.lon, zoom: 14 } : DEFAULT_CENTER);
  const [nonce, setNonce] = useState(0);
  const [viewport, setViewport] = useState<[number, number, number, number] | null>(null);
  const [searchBox, setSearchBox] = useState<[number, number, number, number] | null>(null);
  const [moved, setMoved] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [locMsg, setLocMsg] = useState<string | null>(null);
  const [locBusy, setLocBusy] = useState(false);
  const [sort, setSort] = useState<Sort>(s.reference ? 'distance' : 'observed');
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const lastCenter = useRef(center);

  const f = s.settings.filters;
  const chipId = f.categories.length === 0 ? 'all' : (CHIP_FILTERS.find((ch) => ch.categories.length && ch.categories.length === f.categories.length && ch.categories.every((x) => f.categories.includes(x)))?.id ?? null);

  React.useEffect(() => {
    s.notebook.bookmarks().then((b) => setBookmarked(new Set(b.map((x) => x.installationId))));
  }, [s.notebook, s.rev]);

  // Day-granular "now" keeps the age filter stable during a session without calling Date.now() in render.
  const [today] = useState(() => Date.now());
  const filtered = useMemo(() => applyFilters(s.installations, f, today, s.allClaims), [s.installations, f, s.allClaims, today]);
  const area = searchBox ?? viewport;
  const inArea = useMemo(() => (area ? filtered.filter((i) => inBbox(i, area)) : filtered), [filtered, area]);
  const listItems = useMemo(() => {
    const base = inArea;
    if (sort === 'distance' && s.reference) return sortByDistance(base, s.reference);
    if (sort === 'observed') return [...base].sort((a, b) => (b.lastObservedAt ?? '').localeCompare(a.lastObservedAt ?? '') || a.id.localeCompare(b.id));
    if (sort === 'updated') return [...base].sort((a, b) => (b.sourceModifiedAt ?? '').localeCompare(a.sourceModifiedAt ?? '') || a.id.localeCompare(b.id));
    return [...base].sort((a, b) => installationTitle(a).localeCompare(installationTitle(b)) || a.id.localeCompare(b.id));
  }, [inArea, sort, s.reference]);
  const manufacturersPresent = useMemo(() => [...new Set(s.installations.map((i) => i.manufacturerId).filter(Boolean) as string[])].sort(), [s.installations]);
  const selected = selectedId ? s.installation(selectedId) : null;
  const region = s.publicData.regions[0]?.manifest;

  const onRegion = useCallback((bbox: [number, number, number, number], ctr: { lat: number; lon: number; zoom: number }) => {
    setViewport((prev) => {
      if (!prev) {
        setSearchBox(bbox);
        return bbox;
      }
      return bbox;
    });
    const d = Math.abs(ctr.lat - lastCenter.current.lat) + Math.abs(ctr.lon - lastCenter.current.lon);
    if (d > 0.002) setMoved(true);
  }, []);

  const flyTo = (p: { lat: number; lon: number; zoom: number }) => {
    setCenter(p);
    lastCenter.current = p;
    setNonce((n) => n + 1);
    setSearchBox(null);
    setMoved(false);
  };

  const useLocation = async () => {
    setLocBusy(true);
    setLocMsg(null);
    const r = await requestFix();
    setLocBusy(false);
    if (!r.ok) {
      setLocMsg(`${r.message} Search a place or enter coordinates instead — everything else keeps working.`);
      return;
    }
    s.setReference(r.ref);
    setSort('distance');
    if (r.approximate) setLocMsg('Approximate location only (precise location is off). Distances will be rough.');
    flyTo({ lat: r.ref.lat, lon: r.ref.lon, zoom: 15 });
  };

  const setChip = (id: (typeof CHIP_FILTERS)[number]['id']) => {
    const ch = CHIP_FILTERS.find((x) => x.id === id)!;
    s.updateSettings({ filters: { ...f, categories: ch.categories } });
  };

  const toggleBm = async (i: CameraInstallation) => {
    const on = await s.notebook.toggleBookmark(i.id, `${installationTitle(i)} — ${placeLabelOf(i)}`);
    setToast(on ? 'Bookmark saved to your notebook' : 'Bookmark removed');
    s.bump();
  };

  const shareRecord = async (i: CameraInstallation) => {
    const text = `${installationTitle(i)}\n${placeLabelOf(i)}\nSource: ${sourceBadge(i, s.claimsFor(i.id))} (${s.publicData.regions[0]?.manifest.attribution ?? 'OpenStreetMap contributors'})\nPublic map records can be incomplete or out of date.`;
    const r = await shareBytes(`sightline-${i.id}.txt`, utf8ToBytes(text), 'text/plain', 'Share mapped record');
    if (r.status === 'Sharing unavailable') {
      const ok = await copyText(text);
      setToast(ok ? 'Sharing unavailable — summary copied to clipboard' : r.detail);
    } else setToast(r.status);
  };

  const Header = (
    <View style={{ paddingTop: insets.top + SPACE.s, paddingHorizontal: gutter, gap: SPACE.s }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.s }}>
        <Pressable
          onPress={() => setSearchOpen(true)}
          accessibilityRole="search"
          accessibilityLabel="Search for a place or coordinates"
          style={{ flex: 1, minHeight: 48, borderRadius: RADIUS.chip, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACE.l, gap: SPACE.s }}
        >
          <Search size={20} color={c.text2} />
          <T color={c.text2} numberOfLines={1} style={{ flex: 1 }}>
            {s.reference ? (s.reference.kind === 'current_fix' ? 'Near your location' : 'Near chosen point') : 'Search a place or coordinates'}
          </T>
        </Pressable>
        <SettingsGear />
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={CHIP_FILTERS}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ gap: SPACE.s, paddingVertical: 2 }}
        renderItem={({ item }) => <Chip label={item.id === 'all' ? 'All cameras' : item.label} selected={chipId === item.id} onPress={() => setChip(item.id)} />}
        ListFooterComponent={
          <Chip label={`Filters${activeFilterCount(f) ? ` (${activeFilterCount(f)})` : ''}`} selected={activeFilterCount(f) > (f.categories.length ? 1 : 0)} onPress={() => setFiltersOpen(true)} />
        }
      />
      {s.settings.demoMode && <DemoBanner />}
      {locMsg && (
        <Banner kind="caution" action={<Button kind="ghost" label="Dismiss" onPress={() => setLocMsg(null)} />}>
          {locMsg}
        </Banner>
      )}
      {region?.status === 'refreshFailed' && !s.settings.demoMode && <Banner kind="caution">{`Last refresh failed (${region.lastError}). Showing data fetched ${fmtDate(region.fetchedAt)}.`}</Banner>}
    </View>
  );

  const Sheet = selected ? (
    <View accessibilityViewIsModal={false} style={{ backgroundColor: c.surface, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.border, padding: SPACE.l, gap: SPACE.s, margin: wide ? 0 : SPACE.m }}>
      <View style={{ flexDirection: 'row', gap: SPACE.m, alignItems: 'flex-start' }}>
        <CategoryIcon category={selected.category} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="heading">{installationTitle(selected)}</T>
          <T v="small" color={c.text2}>
            {placeLabelOf(selected)}
          </T>
        </View>
        <IconButton label="Close details" onPress={() => setSelectedId(null)}>
          <X size={20} color={c.text2} />
        </IconButton>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
        <Pill label={sourceBadge(selected, s.claimsFor(selected.id))} tone={sourceBadge(selected, s.claimsFor(selected.id)) === 'Disputed' ? 'caution' : 'neutral'} />
        <Pill label={observedLabel(selected)} />
        {selected.isDemo && <Pill label="DEMO" tone="caution" />}
      </View>
      {(() => {
        const d = distanceFor(selected, s.reference, s.settings.units);
        return d ? (
          <T v="small" style={{ fontVariant: ['tabular-nums'] }}>
            {d.primary}
            {d.qualifiers.length ? ` — ${d.qualifiers[0]}` : ''}
          </T>
        ) : (
          <T v="small" color={c.text2}>
            Distance shown once you choose a reference point or use your location.
          </T>
        );
      })()}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.s }}>
        <Button label="Details" onPress={() => router.push({ pathname: '/camera/[id]', params: { id: selected.id } })} style={{ flexGrow: 1 }} />
        <Button
          label={bookmarked.has(selected.id) ? 'Saved' : 'Save bookmark'}
          kind="secondary"
          icon={bookmarked.has(selected.id) ? <BookmarkCheck size={18} color={c.primary} /> : <Bookmark size={18} color={c.primary} />}
          onPress={() => toggleBm(selected)}
          style={{ flexGrow: 1 }}
        />
        <Button label="Record observation" kind="secondary" icon={<NotebookPen size={18} color={c.primary} />} onPress={() => router.push({ pathname: '/observation/new', params: { installationId: selected.id } })} style={{ flexGrow: 1 }} />
        <Button label="Share" kind="ghost" icon={<Share2 size={18} color={c.primary} />} onPress={() => shareRecord(selected)} />
      </View>
    </View>
  ) : null;

  const renderRow = ({ item: i }: { item: CameraInstallation }) => {
    const d = distanceFor(i, sort === 'distance' ? s.reference : s.reference, s.settings.units);
    return (
      <Pressable
        onPress={() => router.push({ pathname: '/camera/[id]', params: { id: i.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${installationTitle(i)}. ${placeLabelOf(i)}. ${d ? d.primary : ''}. ${sourceBadge(i, s.claimsFor(i.id))}. ${observedLabel(i)}`}
        style={({ pressed }) => [{ flexDirection: 'row', gap: SPACE.m, paddingVertical: SPACE.m, paddingHorizontal: gutter, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface }, pressed && { opacity: 0.8 }]}
      >
        <CategoryIcon category={i.category} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="body" style={{ fontWeight: '600' }}>
            {installationTitle(i)}
          </T>
          <T v="small" color={c.text2} numberOfLines={1}>
            {placeLabelOf(i)}
          </T>
          <T v="caption" color={c.text2} style={{ fontVariant: ['tabular-nums'] }}>
            {[d ? d.primary.replace(' · straight-line', '') : null, sourceBadge(i, s.claimsFor(i.id)), observedLabel(i)].filter(Boolean).join(' · ')}
          </T>
        </View>
      </Pressable>
    );
  };

  const Summary = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.s, backgroundColor: c.surface, borderRadius: RADIUS.card, borderWidth: 1, borderColor: c.border, padding: SPACE.m, marginHorizontal: SPACE.m }}>
      <Pressable onPress={() => setCoverageOpen((v) => !v)} accessibilityRole="button" accessibilityLabel={`Mapped in this area: ${inArea.length}. Public reports are incomplete. Tap for coverage details.`} style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
        <T v="caption" color={c.text2}>
          Mapped in this area
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T v="heading" style={{ fontVariant: ['tabular-nums'] }}>
            {inArea.length}
          </T>
          <Info size={16} color={c.text2} />
          <T v="caption" color={c.text2}>
            Public reports are incomplete
          </T>
        </View>
      </Pressable>
      <Button label={view === 'map' ? 'List' : 'Map'} kind="secondary" icon={view === 'map' ? <List size={18} color={c.primary} /> : <MapIcon size={18} color={c.primary} />} onPress={() => setView(view === 'map' ? 'list' : 'map')} />
    </View>
  );

  const Coverage = coverageOpen ? (
    <View style={{ marginHorizontal: SPACE.m }}>
      <Banner kind="info" title="Public reports are incomplete" action={<Button kind="ghost" label="Close" onPress={() => setCoverageOpen(false)} />}>
        {s.settings.demoMode
          ? 'Demo mode shows one fictional record. Turn demo mode off in Settings to see real community-mapped data.'
          : `These are community-mapped records from OpenStreetMap (${region?.recordCount ?? s.installations.length} in the ${region?.name ?? 'bundled'} region, fetched ${fmtDate(region?.fetchedAt)}). Absence of a pin does not mean absence of a camera; a pin is a report, not proof.`}
      </Banner>
    </View>
  ) : null;

  const mapEl = (
    <View style={{ flex: 1 }}>
      <CameraMap
        installations={filtered}
        selectedId={selectedId}
        reference={s.reference}
        center={center}
        centerNonce={nonce}
        dark={dark}
        offline={s.settings.offlineOnly}
        palette={c}
        onSelect={setSelectedId}
        onRegion={onRegion}
      />
      {s.settings.offlineOnly && (
        <View style={{ position: 'absolute', top: SPACE.m, left: SPACE.m, right: 64 }}>
          <Banner kind="info">Map background unavailable offline. Pins and the list still work.</Banner>
        </View>
      )}
      <View style={{ position: 'absolute', right: SPACE.m, top: s.settings.offlineOnly ? 90 : SPACE.m, gap: SPACE.s }}>
        <IconButton label="Use my location and recenter" onPress={useLocation}>
          <LocateFixed size={22} color={locBusy ? c.text2 : c.primary} />
        </IconButton>
        <IconButton label="Open filters" onPress={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={22} color={c.primary} />
        </IconButton>
      </View>
      {moved && (
        <View style={{ position: 'absolute', top: SPACE.m, alignSelf: 'center' }}>
          <Button
            label="Search this area"
            kind="secondary"
            icon={<RefreshCw size={18} color={c.primary} />}
            onPress={() => {
              setSearchBox(viewport);
              lastCenter.current = center;
              setMoved(false);
            }}
          />
        </View>
      )}
    </View>
  );

  const listEl = (
    <View style={{ flex: 1 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ flexDirection: 'row', gap: SPACE.s, paddingHorizontal: gutter, paddingVertical: SPACE.s, alignItems: 'center' }}>
        <T v="small" color={c.text2}>
          Sort
        </T>
        {(
          [
            ['distance', 'Distance'],
            ['observed', 'Recently observed'],
            ['updated', 'Recently updated'],
            ['name', 'Name'],
          ] as const
        ).map(([k, l]) => (
          <Chip key={k} label={k === 'distance' && !s.reference ? 'Distance (needs a point)' : l} selected={sort === k} onPress={() => (k === 'distance' && !s.reference ? setSearchOpen(true) : setSort(k))} />
        ))}
      </ScrollView>
      <FlatList
        data={listItems}
        contentContainerStyle={{ paddingBottom: wide ? SPACE.l : 120 }}
        keyExtractor={(i) => i.id}
        renderItem={renderRow}
        initialNumToRender={20}
        ListEmptyComponent={
          <View style={{ padding: gutter, gap: SPACE.m }}>
            <T v="heading">No mapped records here</T>
            <T color={c.text2}>No records match these filters in this area. That does not mean no cameras are present.</T>
            <Button label="Reset filters" kind="secondary" onPress={() => s.updateSettings({ filters: { categories: [], manufacturers: [], deployment: [], sourceStatus: [], maxObservationAgeDays: null, includeRemoved: false } })} />
          </View>
        }
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.canvas }}>
      {Header}
      <View style={{ flex: 1, flexDirection: wide ? 'row' : 'column', marginTop: SPACE.s }}>
        {wide ? (
          <>
            <View style={{ width: 420, borderRightWidth: 1, borderRightColor: c.border }}>
              {Sheet}
              {listEl}
            </View>
            {mapEl}
          </>
        ) : view === 'map' ? (
          mapEl
        ) : (
          listEl
        )}
      </View>
      <View style={{ position: wide ? 'relative' : 'absolute', left: 0, right: wide ? undefined : 0, bottom: wide ? undefined : SPACE.s, gap: SPACE.s, width: wide ? 420 : undefined }} pointerEvents="box-none">
        {toast && (
          <Pressable onPress={() => setToast(null)} accessibilityLiveRegion="polite" style={{ alignSelf: 'center', backgroundColor: c.text, borderRadius: RADIUS.chip, paddingHorizontal: SPACE.l, paddingVertical: SPACE.s }}>
            <T v="small" color={c.canvas}>
              {toast}
            </T>
          </Pressable>
        )}
        {!wide && view === 'map' && Sheet}
        {Coverage}
        {Summary}
        {view === 'map' && !s.settings.offlineOnly && (
          <T v="caption" color={c.text2} center style={{ backgroundColor: c.canvas + 'CC', alignSelf: 'center', paddingHorizontal: 8, borderRadius: 6 }}>
            {`Map ${OSM_MAP_ATTRIBUTION} · Data © OpenStreetMap contributors (ODbL)`}
          </T>
        )}
      </View>
      <FiltersSheet
        key={filtersOpen ? 'filters-open' : 'filters-closed'}
        visible={filtersOpen}
        value={f}
        manufacturersPresent={manufacturersPresent}
        onClose={() => setFiltersOpen(false)}
        onApply={(nf) => {
          s.updateSettings({ filters: nf });
          setFiltersOpen(false);
        }}
      />
      <PlaceSearch
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onPlace={(p) => {
          setSearchOpen(false);
          flyTo({ lat: p.lat, lon: p.lon, zoom: p.zoom });
        }}
        onCoords={(p, asRef) => {
          setSearchOpen(false);
          if (asRef) {
            s.setReference({ lat: p.lat, lon: p.lon, kind: 'manual_reference', accuracyM: null, timestamp: null, label: 'Chosen point' });
            setSort('distance');
          }
          flyTo({ lat: p.lat, lon: p.lon, zoom: 15 });
        }}
      />
    </View>
  );
}
