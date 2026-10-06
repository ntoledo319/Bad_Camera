# Sources and data rules

## OpenStreetMap normalization (`osm-norm-1`, `src/domain/osm.ts`)

| OSM tags | Category |
|---|---|
| `man_made=surveillance` + `surveillance:type=ALPR` / `ANPR` / `LPR` | Plate reader (ALPR) |
| `man_made=surveillance` + `surveillance:type=camera` | Video camera |
| `man_made=surveillance` + `surveillance:type=gunshot_detector` | Acoustic sensor (not a camera) |
| `highway=speed_camera` or an `enforcement` tag | Enforcement camera |
| anything else or missing | Unknown — never defaults to ALPR |

- Case-insensitive; synonyms only as listed. Raw tags are kept on every record.
- `manufacturer` / `operator` / `camera:mount` / `camera:direction` / `check_date` become
  source-reported claims, never verified facts. A manufacturer is never shown as the operator.
- `camera:mount=vehicle` or `camera:type=mobile` → vehicle-mounted (hidden from the default layer).
- Ways and relations use Overpass `center`, labelled approximate, with no precision.
- OSM `timestamp` = "map record edited"; `check_date` / `survey:date` = "last in-person check".
  The two never share a label.
- A record missing from a refresh is flagged, never marked removed.

## Source register (`content/sources.ts`)

Research inputs from the build spec. A URL is not a verified claim; manufacturer pages support
the field guide only. Link status: `docs/LINK_CHECK.md`.

| ID | Kind | Scope | Title | URL |
|---|---|---|---|---|
| C1 | manufacturer | productFamily | Flock Safety product hub | https://www.flocksafety.com/products |
| C2 | manufacturer | productFamily | Flock Safety license plate readers | https://www.flocksafety.com/products/license-plate-readers |
| C3a | manufacturer | productFamily | Flock Q2 2023 product announcement (legacy Falcon names) | https://www.flocksafety.com/blog/product-announcement-q2-2023 |
| C3b | manufacturer | productFamily | Flock community safety webinar questions (alias reference) | https://www.flocksafety.com/blog/top-10-questions-answered-from-flocks-community-safety-webinar |
| C4 | manufacturer | productFamily | Flock video cameras (legacy Condor) | https://www.flocksafety.com/products/video-cameras |
| C5a | manufacturer | productFamily | Flock gunshot detection | https://www.flocksafety.com/products/gunshot-detection |
| C5b | manufacturer | productFamily | How Flock audio detection works (Raven former name) | https://www.flocksafety.com/blog/how-flocks-audio-detection-works |
| C6 | manufacturer | productFamily | Axon Outpost | https://www.axon.com/products/axon-outpost |
| C7 | manufacturer | productFamily | Axon Lightpost | https://www.axon.com/products/axon-lightpost |
| C8a | manufacturer | productFamily | Axon Fleet 3 | https://www.axon.com/products/axon-fleet-3 |
| C8b | manufacturer | productFamily | Axon Fleet 3 ALPR introduction (help) | https://www.axon.com/help/fleet-3/cameras-and-sensors/fleet/3/alpr/alpr-introduction.htm |
| C9 | manufacturer | productFamily | Axon Fusus | https://www.axon.com/products/axon-fusus |
| C10 | manufacturer | productFamily | Motorola Solutions L5F fixed LPR camera system | https://www.motorolasolutions.com/en_us/video-security-access-control/license-plate-recognition-camera-systems/l5f-fixed-lpr-camera-system.html |
| C11 | manufacturer | productFamily | Motorola Solutions L6Q quick-deploy LPR | https://www.motorolasolutions.com/en_us/video-security-access-control/license-plate-recognition-camera-systems/l6q-quick-deploy-lpr.html |
| C12 | manufacturer | productFamily | Genetec AutoVu | https://www.genetec.com/products/unified-security/autovu |
| C13 | manufacturer | productFamily | Leonardo ELSAG fixed readers | https://www.leonardocompany-us.com/lpr/elsag-fixed |
| C14a | manufacturer | productFamily | Leonardo LPR products | https://www.leonardocompany-us.com/lpr/products |
| C14b | manufacturer | productFamily | Leonardo physical security solutions (VPH900 context) | https://www.leonardocompany-us.com/lpr/who-we-serve/physical-security-solutions |
| C15 | manufacturer | productFamily | Rekor Edge Pro | https://www.rekor.ai/systems/edge-pro |
| C16 | manufacturer | productFamily | Rekor Edge Max | https://www.rekor.ai/systems/edge-max-alpr |
| C17 | manufacturer | productFamily | Rekor Scout documentation | https://docs.rekor.ai/scout |
| C18 | manufacturer | productFamily | Neology neoForce ANPR camera | https://neology.com/solutions/enforcement/products/neoforce-anpr-camera/ |
| C19 | manufacturer | productFamily | Neology P497 | https://neology.com/solutions/enforcement/products/p497/ |
| C20 | manufacturer | productFamily | Neology mobile enforcement (P720) | https://neology.com/solutions/enforcement/products/mobile-enforcement/ |
| C21a | manufacturer | productFamily | Jenoptik ANPR | https://www.jenoptik.com/products/civil-security/anpr |
| C21b | manufacturer | productFamily | Jenoptik US ALPR | https://www.jenoptik.us/products/civil-security/alpr |
| C22 | manufacturer | productFamily | Axis Q1800-LE-3 License Plate Verifier Kit | https://www.axis.com/products/axis-q1800-le-3 |
| C23 | manufacturer | productFamily | Hanwha Techwin announces Wisenet Road AI | https://www.hanwhavision.com/us/news-events/article/hanwha-techwin-announces-wisenet-road-ai-intelligent-lpr-solution |
| C24 | manufacturer | productFamily | Verra Mobility government safety programs | https://www.verramobility.com/government/safety/ |
| C25 | manufacturer | productFamily | Sensys Gatso U.S. red-light enforcement | https://www.sensysgatso.com/solutions-road-safety-enforcement/u-s-solutions/red-light-enforcement |
| C26 | manufacturer | productFamily | SoundThinking ShotSpotter FAQ | https://www.soundthinking.com/resource-center/faq/shotspotter/ |
| D1 | other | methodology | DeFlock mobile app repository (AGPL-3.0) | https://github.com/FoggedLens/deflock-app |
| D2 | officialRecord | methodology | OpenStreetMap copyright and license (ODbL) | https://www.openstreetmap.org/copyright |
| D3 | other | methodology | OSM Wiki: Tag:man_made=surveillance | https://wiki.openstreetmap.org/wiki/Tag:man_made=surveillance |
| D4 | officialRecord | methodology | OSMF Tile Usage Policy | https://operations.osmfoundation.org/policies/tiles/ |
| D5 | officialRecord | methodology | OSMF Nominatim Usage Policy | https://operations.osmfoundation.org/policies/nominatim/ |
| D6 | other | agency | Atlas of Surveillance — About | https://www.atlasofsurveillance.org/about |
| D7 | other | methodology | OSM Wiki: Overpass API | https://wiki.openstreetmap.org/wiki/Overpass_API |
| L1 | other | legal | ACLU: Photographers' Rights | https://www.aclu.org/issues/free-speech/photographers-rights |
| L2 | officialRecord | legal | Fields v. City of Philadelphia, 862 F.3d 353 (3d Cir. July 7, 2017) | https://www.justice.gov/crt/case-document/geraci-and-fields-v-philadelphia-court-appeals-decision |
| L3 | other | legal | ACLU: Is it legal to photograph or videotape police? (older general guidance) | https://www.aclu.org/news/free-speech/it-legal-photograph-or-videotape-police |
| L4a | officialRecord | legal | Conn. Gen. Stat. Chapter 14 — Freedom of Information Act | https://www.cga.ct.gov/Current/pub/chap_014.htm |
| L4b | officialRecord | legal | Conn. Gen. Stat. Chapter 14 — 2026 Supplement | https://www.cga.ct.gov/2026/sup/chap_014.htm |
| L5a | officialRecord | legal | Connecticut Public Act 26-14 (Substitute S.B. 397), approved May 4, 2026 | https://www.cga.ct.gov/2026/act/pa/pdf/2026PA-00014-R00SB-00397-PA.pdf |
| L5b | officialRecord | legal | S.B. 397 bill status (2026) | https://www.cga.ct.gov/asp/CGABillStatus/cgabillstatus.asp?bill_num=SB397&selBillType=Bill |
| L6 | officialRecord | legal | CT Office of Early Childhood notice (Sept. 9, 2026) | https://www.ctoec.org/news/recent-ice-presence-in-ct-know-your-rights-regardless-of-immigration-status/ |
| T1 | other | methodology | Expo EAS Build introduction | https://docs.expo.dev/build/introduction/ |
| T2 | other | methodology | MapLibre React Native — Expo setup | https://maplibre.org/maplibre-react-native/docs/setup/expo/ |
| T3 | other | methodology | Expo SQLite reference | https://docs.expo.dev/versions/latest/sdk/sqlite/ |
| T4 | other | methodology | Expo Sharing reference | https://docs.expo.dev/versions/latest/sdk/sharing/ |
| T5 | other | methodology | Apple UIActivityViewController | https://developer.apple.com/documentation/uikit/uiactivityviewcontroller |
| T6 | other | methodology | Android: Send simple data to other apps | https://developer.android.com/training/sharing/send |
