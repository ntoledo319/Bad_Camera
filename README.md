# Sightline

**Know what is watching. Keep the evidence.**

A no-login iPhone + Android app (Expo / React Native) for understanding public surveillance
infrastructure: a map of community-mapped cameras and sensors, a field guide for identifying
equipment, a private evidence notebook, privacy-safe sharing, and a cited rights page.

Working name only — trademark not cleared. Full product spec: [`docs/BUILD_SPEC.txt`](docs/BUILD_SPEC.txt).

## What it does

- **Explore** — map + accessible list of OpenStreetMap camera/ALPR/sensor records. Ships with
  Fairfield, CT; download any other U.S. area on demand (one bounded query, saved on device).
  Honest straight-line distances with accuracy and freshness labels.
- **Identify** — photo capture/import, guided feature questions, rule-based candidates with
  "why this may match" — never invented probabilities.
- **Notebook** — private observations (original photos hashed, revisions append-only),
  bookmarks, collections, user-added source links.
- **Share** — redaction editor (masks burned into pixels, metadata stripped), social cards
  (portrait/square/story/wide), evidence PDF, verifiable evidence ZIP, batch export.
- **Learn** — equipment guide (19 families), U.S. rights overview + Connecticut 2026 supplement,
  public-records request builder, methodology.
- **Backup** — encrypted (scrypt + XChaCha20-Poly1305) notebook backup and conflict-safe restore.

No account, no analytics, no backend. Network only for map tiles and explicit data downloads.

## Run it

Requires Node 20+ (tested on Node 26) and npm.

```bash
npm ci                 # also copies MapLibre's web worker into public/
npm run web            # browser preview at http://localhost:8081
npm run check          # typecheck + lint + unit tests + content checks
```

Native apps (need a development build — Expo Go is not supported because of MapLibre):

```bash
npm run prebuild       # generates ios/ and android/ (gitignored)
npm run android        # needs Android SDK + JDK 17
npm run ios            # needs macOS + Xcode
```

Other tools:

```bash
npm run verify-evidence -- path/to/sightline-evidence.zip   # offline ZIP verifier
npm run ingest -- --region fairfield-ct --name "Fairfield, CT" --bbox -73.330,41.115,-73.195,41.225
npm run samples        # regenerate artifacts/samples (demo data only)
npm run export:web     # static web build in dist/
```

## Project layout

```
src/app/          routes (Expo Router)          src/domain/    pure logic: schemas, distance,
src/features/     screen components                            projection, evidence, backup
src/data/         notebook, public data, KV      src/platform/  camera, files, location, auth
content/          catalog, legal, places, regions                (native + .web variants)
tools/            ingest, verify-evidence, content-check, samples, icons
tests/unit/       Vitest suites                  docs/          spec, status, decisions, blockers
```

## Status

See [`docs/STATUS.md`](docs/STATUS.md) for the acceptance log (PASS / FAIL / NOT RUN) and
[`docs/BLOCKERS.md`](docs/BLOCKERS.md) for what still needs the owner. Not production-ready:
native builds, device testing and legal review are outstanding.

## License notes

Camera data © OpenStreetMap contributors, ODbL 1.0. Basemap: OpenFreeMap / OpenMapTiles.
Schematics and the app mark are original. Product names are trademarks of their owners.
