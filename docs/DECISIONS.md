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
else, Explore offers "Download camera data for this area". It first fetches pre-built tiles from
the Sightline data site (D16), each checked against its published SHA-256. Only if that fails,
and only when the user taps "Try OpenStreetMap directly", does it send one bounded Overpass query
(≤0.25° per side). Both clients: one request in flight, 30 s timeout, bounded retries with
backoff + jitter, `Retry-After` honoured, size ceiling.

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

**D16 — Data site.** A static site on Cloudflare Pages (free) serves `v1/manifest.json` plus
1°×1° tiles (split while >4,000 elements) of slim OSM elements: id, coordinates, version, edit
time and tags — mapper usernames, uids and changesets are dropped. The app normalizes tiles with
the same code as direct Overpass downloads. `tools/data-site/build.ts` queries a 2° grid (bbox
queries; state-boundary area queries timed out on every public server), falls back across three
public Overpass instances, stops after 6 consecutive failures, and keeps the last published copy
for any failed cell. GitHub Actions rebuilds daily; deploy runs only when the Cloudflare secrets
exist. ODbL attribution and share-alike notice ship with the data. Indoor cameras
(`surveillance=indoor`) are skipped everywhere as not public-facing.

**D17 — Legal research instead of a lawyer.** The owner cannot hire a lawyer, so every legal
statement is checked against a primary or official source and recorded claim by claim in
`content/legal/review.ts` → `docs/LEGAL_REVIEW.md`; `npm run check` fails if a statement has no
ledger row. The app says "Source-checked · not lawyer-reviewed" and never claims attorney review.
Two 2026 developments found and added: Massimino v. Benoit (2d Cir.) and United States v.
Connecticut (D. Conn.). Public-records citations for all 50 states + DC power the request
builder; unverified entries are labelled in the app.

**D18 — Privacy policy and terms.** One source (`content/legal/policies.ts`) renders both the
in-app screen and the website pages, so store-listing URLs and the app never disagree.

**D19 — Dates.** Date-only values (stored as midnight UTC) are formatted in UTC; before this fix
U.S. users saw OSM check dates and the legal "checked" date one day early.
