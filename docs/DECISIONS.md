# Decisions

Routine choices made during the build, with the reason. Numbers are referenced from code.

**D1 — Stack.** Expo SDK 57, React Native 0.86.3, React 19.2.3, Expo Router 57, TypeScript 6.
Versions are locked in `package-lock.json`. Expo development builds, not Expo Go (MapLibre needs
a native module).

**D2 — Map.** `@maplibre/maplibre-react-native` 11.5 on iOS/Android, `maplibre-gl` 6.12 in the
browser preview, same style and layers. Pins are circle + letter (P/V/E/S/?) so type is not shown
by colour alone. Clusters show a record count, never "cameras".

**D3 — Web worker.** Metro cannot bundle MapLibre GL's module worker. `npm ci` runs
`tools/web/copy-maplibre-worker.mjs`, which copies it into `public/maplibre/` (gitignored), and
`CameraMap.web.tsx` calls `setWorkerUrl()`. `metro.config.js` also points `tslib` at its ES build;
without it the whole web preview crashed on load.

**D4 — Basemap.** OpenFreeMap (OSM-based, no key, attribution required). No offline tile
prefetch (OSMF tile policy and good manners). Offline: plain background + pins + working list,
with "Map background unavailable offline". Clustering is off offline because no glyph font is
available for counts.

**D5 — Camera data.** OpenStreetMap only (`man_made=surveillance`, `highway=speed_camera`), raw
tags kept, normalisation rules in `src/domain/osm.ts` (`osm-norm-1`). Unknown types never default
to ALPR. Relation centroids are flagged approximate. EFF Atlas is linked as agency-level context,
never turned into pins.

**D6 — Downloading other areas.** The app ships one real extract (Fairfield, CT). For anywhere
else, Explore offers "Download camera data for this area": one user-triggered Overpass query for
the visible area, clamped to 0.25° per side, stored as its own region. Client rules: one request
in flight, 30 s timeout, ≤3 retries with exponential backoff + jitter, `Retry-After` honoured,
20 MB ceiling. This fits the spec's development allowance; **production should serve
pre-built regional extracts from an owner-run static host** instead of public Overpass.

**D7 — Search.** Bundled place index (Fairfield neighbourhoods, CT towns, 70+ U.S. cities) and
coordinate entry. No remote geocoding, no Nominatim autocomplete.

**D8 — Private storage.** Native: expo-sqlite (WAL, single-transaction commits) for records;
photo bytes as opaque-named files encrypted with XChaCha20-Poly1305 (`@noble/ciphers`, audited),
key in Keychain/Keystore via expo-secure-store (this-device-only). The SQLite file itself is
**not** encrypted (SQLCipher not enabled, because it could not be verified on both platforms
here); the app says exactly that in Settings → Privacy. Android `allowBackup=false`. Web preview:
IndexedDB, unencrypted, labelled as such.

**D9 — Evidence.** One deterministic public projection feeds cards, PDF and ZIP. Field
allowlist; photos re-encoded with metadata stripped and masks burned in; only photos the user
approved are exported. ZIP has `manifest.json` + `checksums.sha256`; the verifier (in-app and
`tools/verify-evidence`) says "checksums match this manifest", never "authentic". Revision hash
chain uses JCS (`canonicalize`) + SHA-256 and is described as a local chain, not a timestamp.

**D10 — User-added sources.** Observations can carry links the user types (http/https only, no
credentials). They are stored as text, never fetched, labelled "added by you, not verified", and
exported with their own source status (e.g. "News report cited"). Stored in an optional
`userSources` field so older revisions keep their hashes.

**D11 — Batch export.** Notebook multi-select and collections export one ZIP containing a
separate evidence package per record (default public disclosure), so each still verifies alone.

**D12 — Photo AI.** Not shipped. A typed provider interface with `PHOTO_AI_ENABLED = false`; no
fake inference. All identification is the manual guided flow.

**D13 — MP4 export.** Not implemented (no vetted mobile encoder validated here). Story PNG is the
vertical format. Listed in BLOCKERS as an unfinished enhancement.

**D14 — Permissions.** Camera and when-in-use location only, asked at the moment of use.
Microphone, background location, Bluetooth, Wi-Fi scan, contacts, SMS, media-library and AD_ID
are explicitly blocked in `app.json`; Expo's default motion-usage string is removed.

**D15 — Legal content.** U.S. overview from the spec draft with citations; Connecticut 2026
supplement summarises Public Act 26-14 as read from the official PDF. Both marked
"Not attorney-reviewed".
