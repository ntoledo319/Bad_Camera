# Status — 2026-10-06

**Bottom line:** the app is feature-complete against the spec's core scope and works end to end
in the browser preview. Native iOS/Android projects generate cleanly but have **not been compiled
or run** — this machine has no Xcode and no Android SDK. Not production-ready.

## Environment

| Item | Available here |
|---|---|
| macOS 13, Node 26.8, npm 11, JDK 17 | yes |
| Android SDK / emulator | **no** |
| Xcode / iOS simulator | **no** |
| Network (Overpass, OpenFreeMap, link checks) | yes |

## Commands (all run on 2026-10-06)

| Command | Result |
|---|---|
| `npm run typecheck` | PASS, 0 errors |
| `npm run lint` | PASS, 0 errors, 0 warnings |
| `npm test` | PASS, 10 files, 73 tests |
| `npm run content:check` (+ `--links`) | PASS; 2 Axon pages return 403 to bots, CT legislature TLS chain fails from Node — flagged in `docs/LINK_CHECK.md`, not removed |
| `tsx tools/content-check/contrast.ts` | PASS, 20/20 token pairs ≥ target |
| `npm run export:web` | PASS, static build in `dist/`, map + flows verified from the build |
| `expo prebuild --clean --no-install` | PASS, `ios/` and `android/` generated; permissions inspected |
| `npm run verify-evidence` on samples | good package: match; tampered: mismatch (README.txt) |
| Android `assembleRelease` / iOS build | **NOT RUN** — toolchains absent |

## Acceptance log

Web = Playwright-driven Chromium against the Expo web preview (390×844 unless noted).
Unit = Vitest. Screenshots: `artifacts/screenshots/web/`. NOT RUN is not PASS.

| ID | Result | Platform | Evidence |
|---|---|---|---|
| A01 Launch → Explore, no login/notification prompt | PASS | Web | `01-welcome`, `02-explore-map` |
| A02 Location denied → manual point, list, record, export | PASS | Web | denied banner, coordinate entry; Flow C/D ran with no location |
| A03 Approximate/stale fix qualifiers | PASS | Unit + Web | `distance.test.ts`; ±85 m fix shows "(approximate)" in list rows |
| A04 Distance edge cases | PASS | Unit | `distance.test.ts` |
| A05 Equipment pin independent of photographer | PASS | Web + Unit | `07-place-equipment`; distance only when both set |
| A06 Source scopes stay distinct | PASS | Unit | `osm.test.ts`, catalog/legal source scopes |
| A07 Agency-level Atlas never becomes a pin | PASS (by design) | Code | No agency-import path; Atlas is linked as agency context only |
| A08 Unknowns stay "Not established"; no "recorded you" copy | PASS | Web + content-check | `04/05-camera-*`; banned-phrase guard |
| A09 Historical mobile excluded by default | PASS | Unit | `filters.test.ts` |
| A10 Real bounded import keeps IDs, attribution, timestamps | PASS | Unit + Web | bundled Fairfield (76 records); live New Haven download (393 records), `17/18-download-area` |
| A11 Demo mode labelled, separate store, exports marked | PASS | Web + Unit | `22-demo-mode`; DEMO banner on samples |
| A12 Save → restart → intact | PASS | Web + Unit | record intact after reload; `notebook.test.ts` |
| A13 Disk full / cancel / failed save recover | PASS | Unit | `notebook.test.ts` (rollback, disk-full) ; picker cancel handled |
| A14 Edit = revision; original checksum unchanged | PASS | Unit + Web | revision chain shown on record |
| A15 Default exports leak nothing private | PASS | Unit + Web | sensitive-EXIF fixture; downloaded PNG/PDF/ZIP scanned for notes, GPS, filename: none |
| A16 Redaction burned in; original intact | PASS | Unit + Web | `evidence.test.ts`; `10-redaction-review` |
| A17 Four presets legible, nothing cropped | PASS | Web | 1080×1350, 1080×1080, 1080×1920, 1600×900 PNGs inspected |
| A18 Native share sheet / cancel honesty | NOT RUN (native) · PASS (web fallback) | Web | web saves file and reports "Export saved"; native needs a device |
| A19 Evidence verifier: good / modified / traversal / schema | PASS | Unit + CLI + Web | `evidence.test.ts`; `16-verify-tampered` |
| A20 Backup restore, wrong passphrase, collisions | PASS | Unit + Web | restore into a second profile; wrong passphrase → nothing changed |
| A21 Offline cold start works | PARTIAL | Web | offline-only mode: list, records, guide, rights, notebook work; true native cold start NOT RUN |
| A22 OSM attribution visible; no offline tile prefetch | PASS | Web + Code | caption above sheets; no prefetch code |
| A23 Refresh can't overwrite private data or infer removal | PASS | Unit | `osm.test.ts` |
| A24 Screen reader checks | NOT RUN | — | roles/labels present in code; VoiceOver/TalkBack need devices |
| A25 200% text, reduced motion, contrast | PARTIAL | Web + tool | contrast PASS; 320 px layout PASS (`21-narrow`); OS 200% text NOT RUN |
| A26 No unrequested uploads; offline = no requests | PASS | Web + prebuild | 0 external requests in offline-only mode; no mic/BT/background-location in generated manifests |
| A27 Legal page sources, dates, CT safeguard | PASS | Web + Unit | `13-rights`; "Not attorney-reviewed" |
| A28 No secrets/personal data in source | PASS | Repo scan | no keys; demo/fixture data only |
| A29 Android compiles | NOT RUN | — | no Android SDK (see BLOCKERS) |
| A30 Web preview works with native limits shown | PASS | Web | dev server + static `dist/` build |
| A31 One-command checks documented and run | PASS | CLI | `npm run check` |
| A32 Links and catalog schema validate | PASS (2 flagged) | CLI | `docs/LINK_CHECK.md` |

## Main flows (spec §7), browser preview

| Flow | Result |
|---|---|
| A Explore → detail → source → bookmark | PASS |
| B Use my location → nearby list → distance details | PASS (permission granted and denied) |
| C Identify → photo → features → place → review → save → reload | PASS |
| D Record → redact → share studio → 6 export formats | PASS |
| E Notebook → batch export → backup → restore elsewhere → verify | PASS |
| F Offline → records/guide/notebook → capture → export | PARTIAL (offline-only mode on web) |

## Fixed in this pass

- Web preview crashed on load (tslib/Metro) and the browser map was blank (MapLibre worker).
- Coordinate entry was unreachable on phone-height screens (non-scrolling sheet).
- Wrong-passphrase and restore messages appeared off-screen.
- Vehicle-mounted sightings showed in the default layer; unknown deployment was filtered as false.
- Raw data keys (`observation.checkDate`, `reportedPresent`, ISO dates) shown to users.
- All lint errors (components re-created every render, refs read during render, etc.).
- Duplicate page titles, React text-node warning, unused iOS motion permission.

## Added in this pass

- Download camera data for any U.S. area; polite Overpass client; per-region refresh/delete.
- User-added source links on observations; "Add source or correction" on mapped records.
- Batch evidence export from Notebook selection and collections.
- 70+ U.S. cities in offline search; human place labels instead of raw coordinates.
- Share summary on mapped records; discard confirmation and "start new draft" in the stepper.
