/**
 * Research source register (from docs/BUILD_SPEC.txt §23), as Source records.
 * Product sites establish marketed families/capabilities only — not facts about any installed device.
 * Link status is checked by `npm run content:check` and recorded in docs/LINK_CHECK.md.
 */
import type { Source } from '../src/domain/schemas';

type Reg = { id: string; kind: Source['kind']; title: string; publisher: string; url: string; scope: Source['scope']; publishedAt?: string | null; section?: string | null };

const CHECKED = '2026-10-06T00:00:00.000Z';

const reg: Reg[] = [
  { id: 'C1', kind: 'manufacturer', title: 'Flock Safety product hub', publisher: 'Flock Safety', url: 'https://www.flocksafety.com/products', scope: 'productFamily' },
  { id: 'C2', kind: 'manufacturer', title: 'Flock Safety license plate readers', publisher: 'Flock Safety', url: 'https://www.flocksafety.com/products/license-plate-readers', scope: 'productFamily' },
  { id: 'C3a', kind: 'manufacturer', title: 'Flock Q2 2023 product announcement (legacy Falcon names)', publisher: 'Flock Safety', url: 'https://www.flocksafety.com/blog/product-announcement-q2-2023', scope: 'productFamily' },
  { id: 'C3b', kind: 'manufacturer', title: 'Flock community safety webinar questions (alias reference)', publisher: 'Flock Safety', url: 'https://www.flocksafety.com/blog/top-10-questions-answered-from-flocks-community-safety-webinar', scope: 'productFamily' },
  { id: 'C4', kind: 'manufacturer', title: 'Flock video cameras (legacy Condor)', publisher: 'Flock Safety', url: 'https://www.flocksafety.com/products/video-cameras', scope: 'productFamily' },
  { id: 'C5a', kind: 'manufacturer', title: 'Flock gunshot detection', publisher: 'Flock Safety', url: 'https://www.flocksafety.com/products/gunshot-detection', scope: 'productFamily' },
  { id: 'C5b', kind: 'manufacturer', title: 'How Flock audio detection works (Raven former name)', publisher: 'Flock Safety', url: 'https://www.flocksafety.com/blog/how-flocks-audio-detection-works', scope: 'productFamily' },
  { id: 'C6', kind: 'manufacturer', title: 'Axon Outpost', publisher: 'Axon', url: 'https://www.axon.com/products/axon-outpost', scope: 'productFamily' },
  { id: 'C7', kind: 'manufacturer', title: 'Axon Lightpost', publisher: 'Axon', url: 'https://www.axon.com/products/axon-lightpost', scope: 'productFamily' },
  { id: 'C8a', kind: 'manufacturer', title: 'Axon Fleet 3', publisher: 'Axon', url: 'https://www.axon.com/products/axon-fleet-3', scope: 'productFamily' },
  { id: 'C8b', kind: 'manufacturer', title: 'Axon Fleet 3 ALPR introduction (help)', publisher: 'Axon', url: 'https://www.axon.com/help/fleet-3/cameras-and-sensors/fleet/3/alpr/alpr-introduction.htm', scope: 'productFamily' },
  { id: 'C9', kind: 'manufacturer', title: 'Axon Fusus', publisher: 'Axon', url: 'https://www.axon.com/products/axon-fusus', scope: 'productFamily' },
  { id: 'C10', kind: 'manufacturer', title: 'Motorola Solutions L5F fixed LPR camera system', publisher: 'Motorola Solutions', url: 'https://www.motorolasolutions.com/en_us/video-security-access-control/license-plate-recognition-camera-systems/l5f-fixed-lpr-camera-system.html', scope: 'productFamily' },
  { id: 'C11', kind: 'manufacturer', title: 'Motorola Solutions L6Q quick-deploy LPR', publisher: 'Motorola Solutions', url: 'https://www.motorolasolutions.com/en_us/video-security-access-control/license-plate-recognition-camera-systems/l6q-quick-deploy-lpr.html', scope: 'productFamily' },
  { id: 'C12', kind: 'manufacturer', title: 'Genetec AutoVu', publisher: 'Genetec', url: 'https://www.genetec.com/products/unified-security/autovu', scope: 'productFamily' },
  { id: 'C13', kind: 'manufacturer', title: 'Leonardo ELSAG fixed readers', publisher: 'Leonardo', url: 'https://www.leonardocompany-us.com/lpr/elsag-fixed', scope: 'productFamily' },
  { id: 'C14a', kind: 'manufacturer', title: 'Leonardo LPR products', publisher: 'Leonardo', url: 'https://www.leonardocompany-us.com/lpr/products', scope: 'productFamily' },
  { id: 'C14b', kind: 'manufacturer', title: 'Leonardo physical security solutions (VPH900 context)', publisher: 'Leonardo', url: 'https://www.leonardocompany-us.com/lpr/who-we-serve/physical-security-solutions', scope: 'productFamily' },
  { id: 'C15', kind: 'manufacturer', title: 'Rekor Edge Pro', publisher: 'Rekor', url: 'https://www.rekor.ai/systems/edge-pro', scope: 'productFamily' },
  { id: 'C16', kind: 'manufacturer', title: 'Rekor Edge Max', publisher: 'Rekor', url: 'https://www.rekor.ai/systems/edge-max-alpr', scope: 'productFamily' },
  { id: 'C17', kind: 'manufacturer', title: 'Rekor Scout documentation', publisher: 'Rekor', url: 'https://docs.rekor.ai/scout', scope: 'productFamily' },
  { id: 'C18', kind: 'manufacturer', title: 'Neology neoForce ANPR camera', publisher: 'Neology', url: 'https://neology.com/solutions/enforcement/products/neoforce-anpr-camera/', scope: 'productFamily' },
  { id: 'C19', kind: 'manufacturer', title: 'Neology P497', publisher: 'Neology', url: 'https://neology.com/solutions/enforcement/products/p497/', scope: 'productFamily' },
  { id: 'C20', kind: 'manufacturer', title: 'Neology mobile enforcement (P720)', publisher: 'Neology', url: 'https://neology.com/solutions/enforcement/products/mobile-enforcement/', scope: 'productFamily' },
  { id: 'C21a', kind: 'manufacturer', title: 'Jenoptik ANPR', publisher: 'Jenoptik', url: 'https://www.jenoptik.com/products/civil-security/anpr', scope: 'productFamily' },
  { id: 'C21b', kind: 'manufacturer', title: 'Jenoptik US ALPR', publisher: 'Jenoptik', url: 'https://www.jenoptik.us/products/civil-security/alpr', scope: 'productFamily' },
  { id: 'C22', kind: 'manufacturer', title: 'Axis Q1800-LE-3 License Plate Verifier Kit', publisher: 'Axis Communications', url: 'https://www.axis.com/products/axis-q1800-le-3', scope: 'productFamily' },
  { id: 'C23', kind: 'manufacturer', title: 'Hanwha Techwin announces Wisenet Road AI', publisher: 'Hanwha Vision', url: 'https://www.hanwhavision.com/us/news-events/article/hanwha-techwin-announces-wisenet-road-ai-intelligent-lpr-solution', scope: 'productFamily' },
  { id: 'C24', kind: 'manufacturer', title: 'Verra Mobility government safety programs', publisher: 'Verra Mobility', url: 'https://www.verramobility.com/government/safety/', scope: 'productFamily' },
  { id: 'C25', kind: 'manufacturer', title: 'Sensys Gatso U.S. red-light enforcement', publisher: 'Sensys Gatso', url: 'https://www.sensysgatso.com/solutions-road-safety-enforcement/u-s-solutions/red-light-enforcement', scope: 'productFamily' },
  { id: 'C26', kind: 'manufacturer', title: 'SoundThinking ShotSpotter FAQ', publisher: 'SoundThinking', url: 'https://www.soundthinking.com/resource-center/faq/shotspotter/', scope: 'productFamily' },
  { id: 'D1', kind: 'other', title: 'DeFlock mobile app repository (AGPL-3.0)', publisher: 'FoggedLens', url: 'https://github.com/FoggedLens/deflock-app', scope: 'methodology' },
  { id: 'D2', kind: 'officialRecord', title: 'OpenStreetMap copyright and license (ODbL)', publisher: 'OpenStreetMap Foundation', url: 'https://www.openstreetmap.org/copyright', scope: 'methodology' },
  { id: 'D3', kind: 'other', title: 'OSM Wiki: Tag:man_made=surveillance', publisher: 'OpenStreetMap Wiki', url: 'https://wiki.openstreetmap.org/wiki/Tag:man_made=surveillance', scope: 'methodology' },
  { id: 'D4', kind: 'officialRecord', title: 'OSMF Tile Usage Policy', publisher: 'OpenStreetMap Foundation', url: 'https://operations.osmfoundation.org/policies/tiles/', scope: 'methodology' },
  { id: 'D5', kind: 'officialRecord', title: 'OSMF Nominatim Usage Policy', publisher: 'OpenStreetMap Foundation', url: 'https://operations.osmfoundation.org/policies/nominatim/', scope: 'methodology' },
  { id: 'D6', kind: 'other', title: 'Atlas of Surveillance — About', publisher: 'Electronic Frontier Foundation', url: 'https://www.atlasofsurveillance.org/about', scope: 'agency' },
  { id: 'D7', kind: 'other', title: 'OSM Wiki: Overpass API', publisher: 'OpenStreetMap Wiki', url: 'https://wiki.openstreetmap.org/wiki/Overpass_API', scope: 'methodology' },
  { id: 'L1', kind: 'other', title: "ACLU: Photographers' Rights", publisher: 'ACLU', url: 'https://www.aclu.org/issues/free-speech/photographers-rights', scope: 'legal' },
  { id: 'L2', kind: 'officialRecord', title: 'Fields v. City of Philadelphia, 862 F.3d 353 (3d Cir. July 7, 2017)', publisher: 'U.S. Department of Justice (hosting)', url: 'https://www.justice.gov/crt/case-document/geraci-and-fields-v-philadelphia-court-appeals-decision', scope: 'legal', publishedAt: '2017-07-07T00:00:00.000Z' },
  { id: 'L3', kind: 'other', title: 'ACLU: Is it legal to photograph or videotape police? (older general guidance)', publisher: 'ACLU', url: 'https://www.aclu.org/news/free-speech/it-legal-photograph-or-videotape-police', scope: 'legal' },
  { id: 'L4a', kind: 'officialRecord', title: 'Conn. Gen. Stat. Chapter 14 — Freedom of Information Act', publisher: 'Connecticut General Assembly', url: 'https://www.cga.ct.gov/Current/pub/chap_014.htm', scope: 'legal' },
  { id: 'L4b', kind: 'officialRecord', title: 'Conn. Gen. Stat. Chapter 14 — 2026 Supplement', publisher: 'Connecticut General Assembly', url: 'https://www.cga.ct.gov/2026/sup/chap_014.htm', scope: 'legal' },
  { id: 'L5a', kind: 'officialRecord', title: 'Connecticut Public Act 26-14 (Substitute S.B. 397), approved May 4, 2026', publisher: 'Connecticut General Assembly', url: 'https://www.cga.ct.gov/2026/act/pa/pdf/2026PA-00014-R00SB-00397-PA.pdf', scope: 'legal', publishedAt: '2026-05-04T00:00:00.000Z', section: 'Sec. 10 (52-571j); Sec. 13 (ALPR)' },
  { id: 'L5b', kind: 'officialRecord', title: 'S.B. 397 bill status (2026)', publisher: 'Connecticut General Assembly', url: 'https://www.cga.ct.gov/asp/CGABillStatus/cgabillstatus.asp?bill_num=SB397&selBillType=Bill', scope: 'legal' },
  { id: 'L6', kind: 'officialRecord', title: 'CT Office of Early Childhood notice (Sept. 9, 2026)', publisher: 'Connecticut Office of Early Childhood', url: 'https://www.ctoec.org/news/recent-ice-presence-in-ct-know-your-rights-regardless-of-immigration-status/', scope: 'legal', publishedAt: '2026-09-09T00:00:00.000Z' },
  { id: 'T1', kind: 'other', title: 'Expo EAS Build introduction', publisher: 'Expo', url: 'https://docs.expo.dev/build/introduction/', scope: 'methodology' },
  { id: 'T2', kind: 'other', title: 'MapLibre React Native — Expo setup', publisher: 'MapLibre', url: 'https://maplibre.org/maplibre-react-native/docs/setup/expo/', scope: 'methodology' },
  { id: 'T3', kind: 'other', title: 'Expo SQLite reference', publisher: 'Expo', url: 'https://docs.expo.dev/versions/latest/sdk/sqlite/', scope: 'methodology' },
  { id: 'T4', kind: 'other', title: 'Expo Sharing reference', publisher: 'Expo', url: 'https://docs.expo.dev/versions/latest/sdk/sharing/', scope: 'methodology' },
  { id: 'T5', kind: 'other', title: 'Apple UIActivityViewController', publisher: 'Apple', url: 'https://developer.apple.com/documentation/uikit/uiactivityviewcontroller', scope: 'methodology' },
  { id: 'T6', kind: 'other', title: 'Android: Send simple data to other apps', publisher: 'Android Developers', url: 'https://developer.android.com/training/sharing/send', scope: 'methodology' },
];

export const SOURCE_REGISTER: Source[] = reg.map((r) => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  publisher: r.publisher,
  url: r.url,
  publishedAt: r.publishedAt ?? null,
  accessedAt: CHECKED,
  licenseId: null,
  sourceRecordId: null,
  sourceVersion: null,
  documentPageOrSection: r.section ?? null,
  localSnapshotPath: null,
  snapshotSha256: r.id === 'L5a' ? '614c5c38e44e76c89410a73aed4ba44fdd7f97b646046fa1a8e731c1b061f076' : null,
  availability: 'notChecked',
  attribution: r.publisher,
  retrievalMethod: 'Research register (manual)',
  scope: r.scope,
}));

export const SOURCE_BY_ID: Record<string, Source> = Object.fromEntries(SOURCE_REGISTER.map((s) => [s.id, s]));
