/**
 * Claim-by-claim legal research ledger — the substitute for a lawyer's review, as far as research
 * can go. Every section of every legal article has at least one row; each row names the source
 * and the pinpoint that supports it. `tools/content-check/legal-ledger.ts` enforces completeness
 * and renders docs/LEGAL_REVIEW.md.
 *
 * status:
 *   verified   — read in the cited source and matches
 *   corrected  — an earlier wording was wrong or incomplete; the current text was fixed and re-checked
 *   product    — a statement about how Sightline itself works (verified against the code, not law)
 *   disclosed  — could not be confirmed against official text; the app says so next to it
 */
import { ALPR_LAWS } from './alprLaws';

export type ReviewStatus = 'verified' | 'corrected' | 'product' | 'disclosed';
export interface ReviewRow {
  article: string;
  section: string;
  claim: string;
  status: ReviewStatus;
  sourceIds: string[];
  pinpoint: string;
}

export const REVIEW_CHECKED_AT = '2026-10-06';
export const REVIEW_METHOD =
  'Each source was fetched on 2026-10-06 and read; court opinions and the Connecticut act were read as PDFs (key holdings spot-checked twice, independently). Sites that block automated access (aclu.org, some legislatures) were confirmed through an official affiliate copy or marked "disclosed".';

const US = 'us-overview';
const CT = 'ct-supplement';

export const REVIEW_ROWS: ReviewRow[] = [
  { article: US, section: 'lead', claim: 'Sightline does not access camera feeds or law-enforcement databases.', status: 'product', sourceIds: [], pinpoint: 'No feed, database or network-scanning code exists in src/; network use is limited to map tiles and user-triggered data downloads (docs/DECISIONS.md D2–D6).' },
  { article: US, section: 'lead', claim: 'The First Amendment provides an important basis for public photography and discussion of government activity; details depend on place and conduct.', status: 'verified', sourceIds: ['L1', 'L2'], pinpoint: 'ACLU guide (affiliate copy, p. 1); Fields, 862 F.3d at 355–56, 360.' },
  { article: US, section: 'public-observation', claim: 'Photographing things plainly visible in public spaces, including the outside of government buildings, is a constitutional right (ACLU).', status: 'verified', sourceIds: ['L1', 'L23'], pinpoint: 'ACLU Know Your Rights: Photographers, opening paragraph (confirmed via ACLU of Idaho copy and ACLU search listing).' },
  { article: US, section: 'public-observation', claim: 'Appeals courts recognize a right to photograph and record matters of public interest, subject to time, place and manner limits (Smith; Askins).', status: 'verified', sourceIds: ['L17', 'L15'], pinpoint: 'Smith (holding: right "subject to reasonable time, manner and place restrictions, to photograph or videotape police conduct"); Askins ("The First Amendment protects the right to photograph and record matters of public interest").' },
  { article: US, section: 'public-observation', claim: 'On private property the owner can set photography rules; refusing to leave can lead to a trespass arrest.', status: 'verified', sourceIds: ['L23'], pinpoint: 'ACLU guide, "Private property" paragraph.' },
  { article: US, section: 'recording-government', claim: 'Nine circuits (1st, 2nd, 3rd, 4th, 5th, 7th, 9th, 10th, 11th) recognize a right to record police/officials in public.', status: 'corrected', sourceIds: ['L11', 'L7', 'L2', 'L13', 'L12', 'L14', 'L15', 'L16', 'L17'], pinpoint: 'Holdings read in each opinion PDF (Glik; Massimino slip op. at 3; Fields, 862 F.3d at 355–56; Sharpe; Turner; Alvarez; Askins; Irizarry; Smith). Massimino itself lists its sister circuits. Earlier text cited only Fields.' },
  { article: US, section: 'recording-government', claim: 'Massimino v. Benoit (2d Cir. Aug. 17, 2026) covers recording the visible exterior of a police station from a public sidewalk.', status: 'verified', sourceIds: ['L7'], pinpoint: 'Slip op. at 1–3 (caption: "Decided: August 17, 2026"; "That right encompasses Massimino’s recording of the exterior of a police station from a public sidewalk").' },
  { article: US, section: 'recording-government', claim: 'The 6th, 8th and D.C. Circuits have not clearly decided; the Supreme Court has not ruled and denied review on March 23, 2026.', status: 'verified', sourceIds: ['L20'], pinpoint: 'Order list 03/23/2026 (Villarreal v. Alaniz, certiorari denied); no published 6th/D.C. ruling found; 8th Cir. Molina, 59 F.4th 334, left the question open.' },
  { article: US, section: 'recording-government', claim: 'Limits include reasonable time/place/manner restrictions; officers in Fields, Turner and Massimino received qualified immunity.', status: 'verified', sourceIds: ['L2', 'L12', 'L7'], pinpoint: 'Fields, 862 F.3d at 360 (limits) and qualified-immunity holding; Turner (right not clearly established at the time); Massimino slip op. at 3–4.' },
  { article: US, section: 'staying-safe', claim: 'In Massimino a brief stop was lawful and refusing an ID order gave probable cause under Conn. Gen. Stat. § 53a-167a.', status: 'verified', sourceIds: ['L7'], pinpoint: 'Slip op. at 4 ("subsequent failure to comply with the officers’ order that he produce identification afforded the officers probable cause … § 53a-167a").' },
  { article: US, section: 'staying-safe', claim: 'Officers may give legitimate safety orders, such as stepping back from a traffic stop (Gericke).', status: 'verified', sourceIds: ['L18'], pinpoint: 'Gericke opinion (officers may order a bystander to move back; an order aimed at filming itself needs a reasonable basis).' },
  { article: US, section: 'staying-safe', claim: 'Indiana’s 25-foot buffer law survived a facial First Amendment challenge (Nicodemus, 7th Cir. 2025).', status: 'verified', sourceIds: ['L19'], pinpoint: 'Nicodemus, 137 F.4th 654 (affirming denial of preliminary injunction on facial challenge). A separate 2025 vagueness ruling (RCFP v. Rokita) is not relied on.' },
  { article: US, section: 'staying-safe', claim: 'Practical steps (stay calm, ask if free to leave, keep distance, know ID laws).', status: 'verified', sourceIds: ['L1'], pinpoint: 'ACLU guide, "If you are stopped or detained" section.' },
  { article: US, section: 'audio', claim: 'Federal law and most states are one-party consent; RCFP lists 11 all-party states (CA, DE, FL, IL, MD, MA, MI, MT, NH, PA, WA) with partial rules elsewhere.', status: 'verified', sourceIds: ['L21'], pinpoint: 'RCFP Reporter’s Recording Guide, state summary table; 18 U.S.C. § 2511(2)(d). Lists differ between sources (DMLP omits DE and MI, adds CT).' },
  { article: US, section: 'audio', claim: 'ACLU v. Alvarez limited Illinois’ eavesdropping law as applied to openly recording police in public.', status: 'verified', sourceIds: ['L14'], pinpoint: 'Alvarez opinion, disposition (preliminary injunction ordered against enforcement as applied).' },
  { article: US, section: 'audio', claim: 'Sightline takes still photos only and never requests the microphone.', status: 'product', sourceIds: [], pinpoint: 'app.json blocks RECORD_AUDIO; expo-image-picker microphonePermission: false; capture uses still images only.' },
  { article: US, section: 'reading-sharing', claim: 'OpenStreetMap data is licensed under the ODbL, requiring attribution and share-alike for derived databases.', status: 'verified', sourceIds: ['D2'], pinpoint: 'openstreetmap.org/copyright, "The legal code" and "How to credit OpenStreetMap".' },
  { article: US, section: 'not-authorized', claim: 'Do not trespass, interfere, damage equipment or access systems; audio rules differ from photography.', status: 'verified', sourceIds: ['L23', 'L21'], pinpoint: 'ACLU guide (private property, interference); RCFP guide (audio consent).' },
  { article: US, section: 'not-authorized', claim: 'Do not harass people or publish unsupported accusations.', status: 'product', sourceIds: [], pinpoint: 'Prudential instruction mirrored in the terms of use (data-site/terms.html).' },
  { article: US, section: 'public-records', claim: 'State public-records laws, not federal FOIA, usually govern local and state agencies; all 50 states + DC listed with citations.', status: 'verified', sourceIds: ['L4a'], pinpoint: 'Federal FOIA applies to federal agencies (5 U.S.C. § 552(f)); state entries verified individually in content/legal/recordsLaws.ts (49 of 51 against official text; CA and NM marked unverified in the app).' },
  { article: US, section: 'what-records-prove', claim: 'Checksums show integrity, not authenticity; device time and location are not independently verified.', status: 'product', sourceIds: [], pinpoint: 'src/domain/evidence.ts (verifier wording) and src/domain/observation.ts (hash chain is local).' },
  { article: US, section: 'three-questions', claim: 'Carpenter held long-term cell-site records access is a search and did not call security cameras into question.', status: 'verified', sourceIds: ['L22'], pinpoint: 'Carpenter, majority opinion, closing limitation ("conventional surveillance techniques and tools, such as security cameras").' },
  { article: US, section: 'three-questions', claim: 'No federal appeals court has decided whether ALPR database searches are Fourth Amendment searches; Schmidt v. City of Norfolk is on appeal (4th Cir. No. 26-1227).', status: 'verified', sourceIds: ['L22'], pinpoint: 'Research memo: Yang (9th) decided on standing; Mapson (11th) on good faith; Schmidt summary judgment Jan. 27, 2026, appeal docketed.' },
  { article: US, section: 'jurisdiction', claim: 'U.S.-only overview; legal-aid organizations and ACLU affiliates sometimes help without charge.', status: 'product', sourceIds: [], pinpoint: 'Scope statement.' },

  { article: CT, section: 'lead', claim: 'No amendment found as of Oct. 6, 2026; DOJ sued over Sections 3–6 as applied to federal officers; no ruling.', status: 'corrected', sourceIds: ['L5b', 'L8'], pinpoint: 'Bill status page (no action after 5/6/2026); complaint ¶¶ 3–4 ("parts of Sections 3, 4, 5, and 6"). Earlier text said litigation was not checked.' },
  { article: CT, section: 'ct-second-circuit', claim: 'Massimino holdings: right to record; brief stop lawful; ID refusal → probable cause under § 53a-167a; qualified immunity; nonpublic security features left open.', status: 'verified', sourceIds: ['L7'], pinpoint: 'Slip op. at 1–4 and discussion of "nonpublic security features".' },
  { article: CT, section: 'ct-recording-officers', claim: 'Employer liability under § 52-571j dates to 2015; 2026 act widened "peace officer" to federal officers, added federal-criminal-law exception and an immunity bar for listed intentional torts.', status: 'corrected', sourceIds: ['L10', 'L5a'], pinpoint: '§ 52-571j(b) (June Sp. Sess. P.A. 15-4, § 9); PA 26-14 § 10(b)–(d), p. 24. Earlier text implied employer liability was new.' },
  { article: CT, section: 'ct-recording-officers', claim: 'The "peace officer" definition relied on is in Section 3, which the federal lawsuit challenges.', status: 'verified', sourceIds: ['L8', 'L5a'], pinpoint: 'PA 26-14 § 3 (new § 51-277a definition); complaint ¶ 4.' },
  { article: CT, section: 'ct-alpr-records', claim: 'ALPR data confidential; camera locations public (DHS no-disclosure exception); audit-derived data and usage/access logs public with plate data redacted; owners may get their own data.', status: 'corrected', sourceIds: ['L5a'], pinpoint: 'PA 26-14 § 13(e)(1)–(3), p. 34. "Audit reports" corrected to "data derived from audits".' },
  { article: CT, section: 'ct-alpr-retention', claim: '21-day retention from Oct. 1, 2026 with listed exceptions; banned uses; out-of-state sharing limits.', status: 'verified', sourceIds: ['L5a', 'L9'], pinpoint: 'PA 26-14 § 13(b)(2), (c), (d), pp. 27–33; OLR summary.' },
  { article: CT, section: 'ct-alpr-retention', claim: 'Definition excludes a device "that provides evidence used in enforcement of an offense".', status: 'corrected', sourceIds: ['L5a'], pinpoint: 'PA 26-14 § 13(a)(1), p. 26 (quoted; earlier text added the word "only").' },
  { article: CT, section: 'ct-alpr-retention', claim: 'Policies due Jan. 1, 2027; private right of action for injunction and AG vendor penalties from Oct. 1, 2026.', status: 'verified', sourceIds: ['L5a'], pinpoint: 'PA 26-14 § 13(f), § 13(j), § 14(b).' },
  { article: CT, section: 'ct-foia', claim: 'CT FOIA § 1-210 applies; no response in 4 business days = denial; 30 days to appeal to the FOI Commission; § 1-210(b)(19) safety exemption may be claimed.', status: 'verified', sourceIds: ['L4a'], pinpoint: 'Conn. Gen. Stat. § 1-206(a) (failure to comply within four business days deemed a denial), § 1-206(b)(1) (appeal within thirty days); § 1-210(b)(19).' },
  { article: CT, section: 'ct-foia', claim: 'Model policy, adopted policies, usage reports, vendor contracts and sharing declarations are records worth requesting.', status: 'verified', sourceIds: ['L5a', 'L9'], pinpoint: 'PA 26-14 §§ 13(g)–(h), 14, 15.' },
  { article: CT, section: 'ct-litigation', claim: 'United States v. Connecticut, No. 3:26-cv-758, filed May 15, 2026; Sections 3–6 challenged under the Supremacy Clause; § 13 not challenged.', status: 'verified', sourceIds: ['L8'], pinpoint: 'Complaint caption ("Case No.: 3:26-cv-758"), ¶¶ 1–4, n.1; Prayer for Relief.' },
  { article: CT, section: 'ct-litigation', claim: 'Hearing in early September 2026; no ruling found as of Oct. 6, 2026.', status: 'verified', sourceIds: ['L8'], pinpoint: 'News reports Sept. 3–4, 2026 (secondary); no order located on the docket summary.' },
  { article: CT, section: 'ct-status', claim: 'Act PDF (42 pages) hash recorded; CGA served an incomplete TLS chain.', status: 'verified', sourceIds: ['L5a', 'L5b'], pinpoint: 'SHA-256 re-computed on 2026-10-06 matches; openssl verify code 21 (unable to verify the first certificate).' },
  ...ALPR_LAWS.map(
    (l): ReviewRow => ({
      article: 'state-alpr-laws',
      section: `alpr-${l.code.toLowerCase()}`,
      claim: `${l.state}: ${l.statute}; retention ${l.retention}.`,
      status: l.verified ? 'verified' : 'disclosed',
      sourceIds: [`ALPR-${l.code}`],
      pinpoint: l.verified ? (/findlaw|public\.law/.test(l.url) ? 'Statute text read on a mirror (official site blocked automated access).' : 'Statute text read on the official site.') : 'Not confirmed against official text; the app labels it unverified.',
    }),
  ),
  { article: 'state-alpr-laws', section: 'lead', claim: 'ALPR statutes regulate operators, not people photographing cameras; missing states may regulate otherwise.', status: 'verified', sourceIds: [], pinpoint: 'Scope statement derived from the statutes listed (each regulates use/retention by operators).' },
];

/** Residual risks a lawyer would still weigh — shown in docs/LEGAL_REVIEW.md. */
export const RESIDUAL_RISKS: string[] = [
  'Fast-moving law: Connecticut’s federal lawsuit, the Schmidt v. Norfolk appeal and 2026 state ALPR laws can change these pages. Re-check before relying on them; the ledger date is shown in the app.',
  'California and New Mexico public-records citations, and the Oklahoma ALPR entry, rest on secondary sources because official sites blocked automated retrieval; the app labels them.',
  'All-party-consent state lists differ between reputable sources; the app uses the RCFP list and says lists vary.',
  'Whether photographing “nonpublic security features” can be restricted was expressly left open in Massimino.',
  'Defamation and harassment risk sits with what users publish; the app frames pins as reports, never proof, and the terms prohibit unsupported accusations.',
  'Trademark use of manufacturer names in the field guide relies on nominative fair use (names used only to identify products, no logos, no endorsement claim).',
  'Publishing the OpenStreetMap-derived database requires ODbL attribution and share-alike; the data site includes both.',
  'This ledger is research, not legal advice; no lawyer has reviewed it.',
];
