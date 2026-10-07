/**
 * Legal information content. NOT legal advice. NOT reviewed by a lawyer.
 * Every statement was checked claim by claim against the cited primary or official source on
 * 2026-10-06; the ledger is docs/LEGAL_REVIEW.md (generated from content/legal/review.ts).
 * Connecticut text is summarised from the official PDF of Public Act 26-14
 * (SHA-256 614c5c38e44e76c89410a73aed4ba44fdd7f97b646046fa1a8e731c1b061f076, retrieved 2026-10-06).
 */
import type { LegalArticle } from '../../src/domain/schemas';
import { ALPR_LAWS } from './alprLaws';

export const LEGAL_CHECKED_AT = '2026-10-06T00:00:00.000Z';
export const REVIEW_LABEL = 'Source-checked · not lawyer-reviewed';
const VALIDATION = 'Each statement checked against the cited source on 2026-10-06 (docs/LEGAL_REVIEW.md). Not reviewed by a lawyer.';

export const US_OVERVIEW: LegalArticle = {
  id: 'us-overview',
  jurisdiction: 'United States',
  title: 'Why public camera mapping can be lawful',
  subtitle: 'Public observation, truthful documentation and responsible sharing — with real boundaries.',
  lead:
    'Sightline is designed to help you observe equipment from places you may lawfully be, keep your own records, and read or share lawfully obtained public information. It does not access camera feeds or law-enforcement databases. In the United States, the First Amendment provides an important basis for public photography, information gathering and discussion of government activity. The details depend on location, conduct and the applicable law.',
  sections: [
    {
      id: 'public-observation',
      title: 'Public observation',
      body: "The ACLU's guidance is that taking photographs of things plainly visible in public spaces is a constitutional right, including the outside of government buildings. Federal appeals courts have recognized a First Amendment right to photograph and record matters of public interest, subject to reasonable time, place and manner limits (for example Smith v. City of Cumming, 11th Cir. 2000; Askins v. DHS, 9th Cir. 2018). Public visibility is not permission to enter someone else's property: on private property the owner can set rules about photography, and refusing to leave can lead to a trespass arrest. Sightline is built around observation from lawful vantage points. Restricted facilities and valid safety orders still matter.",
      sourceIds: ['L1', 'L23', 'L17', 'L15'],
    },
    {
      id: 'recording-government',
      title: 'Recording police and officials',
      body: 'Nine federal courts of appeals — the 1st, 2nd, 3rd, 4th, 5th, 7th, 9th, 10th and 11th Circuits — have recognized a First Amendment right to record police and officials doing their jobs in public (for example Glik v. Cunniffe, 1st Cir. 2011; Fields v. City of Philadelphia, 3d Cir. 2017; Turner v. Driver, 5th Cir. 2017; Irizarry v. Yehia, 10th Cir. 2022). On August 17, 2026, the 2nd Circuit (covering Connecticut, New York and Vermont) joined them in Massimino v. Benoit, holding that the right covers recording the publicly visible exterior of a police station from a public sidewalk. The 6th, 8th and D.C. Circuits have not clearly decided the question, and the U.S. Supreme Court has not ruled on it (it most recently declined a case on March 23, 2026). The right has limits: courts accept reasonable time, place and manner restrictions and orders that address real interference. In many of these cases, including Fields, Turner and Massimino, the officers still avoided personal damages through qualified immunity because the right was not yet clearly established when they acted.',
      sourceIds: ['L11', 'L7', 'L2', 'L13', 'L12', 'L14', 'L15', 'L16', 'L17', 'L20'],
    },
    {
      id: 'staying-safe',
      title: 'If an officer stops you',
      body: 'Stay calm and do not physically resist. Recording or photographing in public is not by itself grounds for suspicion, but it can be part of the picture: in Massimino the court found a brief stop lawful after long filming near dusk and evasive behavior, and held that refusing a lawful order to show identification during that stop gave probable cause to arrest under Connecticut’s interference law. Officers may also give legitimate safety orders, such as telling a bystander to step back from a traffic stop (Gericke v. Begin, 1st Cir. 2014), and some states have “buffer” laws requiring people to stay a set distance from officers on request (Indiana’s 25-foot law was upheld against a facial First Amendment challenge in Nicodemus v. City of South Bend, 7th Cir. 2025). Practical steps: stay on public ground, keep your distance, avoid lingering at police or government security sites, ask whether you are free to leave, and know whether your state requires you to identify yourself during a lawful stop.',
      sourceIds: ['L7', 'L18', 'L19', 'L1'],
    },
    {
      id: 'audio',
      title: 'Photos versus audio',
      body: 'Sightline takes still photos only and never uses the microphone. That matters because recording conversations is governed by separate wiretap and eavesdropping laws. Federal law and most states allow recording when one party to the conversation consents, but about a dozen states require every party’s consent for at least some conversations (the Reporters Committee lists California, Delaware, Florida, Illinois, Maryland, Massachusetts, Michigan, Montana, New Hampshire, Pennsylvania and Washington, with partial rules in others). Courts have limited some of these laws as applied to openly recording police in public (ACLU of Illinois v. Alvarez, 7th Cir. 2012). Silent photographs of equipment are not conversations.',
      sourceIds: ['L21', 'L14'],
    },
    {
      id: 'reading-sharing',
      title: 'Reading and sharing sources',
      body: "The app supports public understanding by distinguishing a document's contents, an observation and an inference. Use sources you are entitled to access, credit licensed datasets and photographs appropriately, and describe uncertainty. A map pin does not establish that its owner acted illegally or recorded you. The right to discuss surveillance does not erase privacy, copyright or other applicable obligations. Map records come from OpenStreetMap under the Open Database License, which requires attribution and share-alike for derived databases.",
      sourceIds: ['D2'],
    },
    {
      id: 'not-authorized',
      title: 'What the app does not authorize',
      body: 'Do not trespass, interfere with officers or traffic, damage or obstruct equipment, or access a system without authorization. Still photography and recording a private conversation are not the same legal issue; audio-recording rules vary. The core capture flow takes photographs and does not request microphone access. Do not use this tool to harass people or publish unsupported accusations.',
      sourceIds: ['L23', 'L21'],
    },
    {
      id: 'public-records',
      title: 'Public records',
      body: 'Every state has its own public-records law, and those laws — not the federal FOIA — usually apply to a town police department or state agency. Sightline’s request builder lists the law and citation for all 50 states and the District of Columbia and links to the official text. Public-records laws can help you learn which agency bought a system, what its contract says and what policies govern it. Exemptions, redactions, fees and residency limits can apply, and some states set a response deadline while others only require a prompt response. The builder prepares a draft for you to review and send; it does not guarantee disclosure.',
      sourceIds: ['L4a'],
    },
    {
      id: 'what-records-prove',
      title: 'What our records prove',
      body: "A record can preserve the photograph you supplied, the information you entered, the source version saved, and the app's distance calculation. A checksum helps compare file integrity. Neither a checksum nor a location pin establishes that a camera was active, captured you or shared your data. Device timestamps and locations are not independently verified.",
      sourceIds: [],
    },
    {
      id: 'three-questions',
      title: 'Three different questions',
      body: "Your right to document and discuss equipment, the license terms of a dataset you reuse, and whether an operator's deployment is lawful are separate questions. First Amendment protections for observing and speaking are distinct from Fourth Amendment limits on government tracking. The Supreme Court held in Carpenter v. United States (2018) that obtaining long-term cell-phone location records is a search, while saying it was not calling into question conventional tools such as security cameras. As of October 2026 no federal court of appeals has decided whether searching a plate-reader database is a Fourth Amendment search; a challenge to Norfolk, Virginia’s Flock cameras (Schmidt v. City of Norfolk) is on appeal in the 4th Circuit. None of these decisions gives you any particular immunity.",
      sourceIds: ['L1', 'L22', 'D2'],
    },
    {
      id: 'jurisdiction',
      title: 'Jurisdiction and updates',
      body: 'This overview concerns the United States. Rules can differ by state and place and change over time. Read the linked sources and seek local legal advice for a specific dispute; legal-aid organizations and ACLU affiliates can sometimes help without charge. Each article shows when its sources were checked. No guidance is provided here for other countries.',
      sourceIds: [],
    },
  ],
  sourceIds: ['L1', 'L23', 'L2', 'L7', 'L11', 'L12', 'L14', 'L15', 'L16', 'L17', 'L18', 'L19', 'L20', 'L21', 'L22', 'L4a', 'D2'],
  sourceCheckedAt: LEGAL_CHECKED_AT,
  effectiveDateNotes: 'General U.S. overview; case law as of October 6, 2026.',
  reviewStatus: 'not_attorney_reviewed',
  validationStatus: VALIDATION,
};

export const CT_SUPPLEMENT: LegalArticle = {
  id: 'ct-supplement',
  jurisdiction: 'Connecticut',
  title: 'Connecticut: what changed in 2026',
  subtitle: 'Public Act 26-14 (Substitute S.B. 397), approved May 4, 2026 — summary of the enacted text.',
  lead:
    'Connecticut changed relevant law in 2026. Below is a plain-language summary of sections we read in the official enacted text. As of October 6, 2026, we found no amendment to the sections summarized here. The U.S. Department of Justice has sued Connecticut over other parts of the act (Sections 3 to 6, as applied to federal officers); no ruling had issued as of that date. No lawyer has reviewed this page. Read the official act before relying on any detail.',
  sections: [
    {
      id: 'ct-second-circuit',
      title: 'Recording in public: the court ruling that now applies in Connecticut',
      body: 'In Massimino v. Benoit (Aug. 17, 2026), the federal appeals court for Connecticut held that the First Amendment protects recording law-enforcement activity in public, including filming the visible exterior of the Waterbury police station from a public sidewalk. The same decision upheld a brief stop of the filmer and held that his refusal of an order to produce identification during that stop gave probable cause to arrest for interfering with an officer (Conn. Gen. Stat. § 53a-167a). The officers received qualified immunity on the First Amendment claim. The court left open whether recording nonpublic security features could be restricted.',
      sourceIds: ['L7'],
    },
    {
      id: 'ct-recording-officers',
      title: 'Recording peace officers (Sec. 10, amending § 52-571j; effective from passage)',
      body:
        "Since 2015, section 52-571j has made the employer of a peace officer who interferes with someone photographing or video-recording an officer on duty liable to that person in a civil action. The 2026 act expanded who counts as a “peace officer” to include federal law-enforcement officers (tribal units remain excluded) and added an immunity rule. The employer is not liable if the officer had reasonable grounds to believe the interference was needed to lawfully enforce a criminal law (including federal criminal law) or ordinance, protect public safety, preserve a crime scene or investigation, safeguard someone's privacy (including a crime victim), or enforce Judicial Branch rules on recording in court facilities. An officer found to have committed certain intentional torts (assault, battery, false imprisonment, false arrest, abuse of process or malicious prosecution) while interfering with such recording may not assert privilege or immunity against civil liability. Applying this to federal officers faces federal-immunity arguments, and the definition it relies on is part of Section 3, which the federal lawsuit challenges. This is a civil remedy; it does not authorize interfering with officers, traffic or a scene.",
      sourceIds: ['L5a', 'L10', 'L8'],
    },
    {
      id: 'ct-alpr-records',
      title: 'Plate-reader camera locations are public records (Sec. 13(e))',
      body:
        'Plate-reader data itself (plate characters, vehicle images, location and time data) is confidential and not a public record under the Freedom of Information Act. However, the act deems the locations of cameras used as part of a plate-reader system to be public records — except where the camera purchase was funded at least in part by the U.S. Department of Homeland Security on the condition that its location not be disclosed. Data derived from audits, usage logs and access logs are also public records, with plate-reader data redacted. A registered owner may request plate-reader data about their own vehicle from the contracting agency (with the consent of any co-registrant).',
      sourceIds: ['L5a', 'L9'],
    },
    {
      id: 'ct-alpr-retention',
      title: 'Plate-reader retention, use and sharing limits (Sec. 13; operative October 1, 2026)',
      body:
        'On and after October 1, 2026, plate-reader data held by a public agency or its contracted vendor generally may not be kept longer than twenty-one days (or a shorter contractual period), with listed exceptions such as a warrant or court order, an active criminal investigation with supervisor approval and a case number, and highway-usage-fee collection. The act bans uses including monitoring based on protected characteristics, identifying people engaged in First Amendment activity, immigration enforcement, and reproductive or gender-affirming health care. Sharing outside Connecticut is limited: agencies in New York, Rhode Island and Massachusetts may receive data with a written declaration, and anyone else (including federal agencies) generally only with a warrant. The act’s plate-reader definition excludes a device “that provides evidence used in enforcement of an offense” under state law or a municipal ordinance, such as automated traffic-enforcement, work-zone speed and school-bus violation cameras; how far this exclusion reaches has not been tested. Agencies must adopt and publish usage policies by January 1, 2027. From October 1, 2026 an aggrieved person may sue an agency for an injunction, and the Attorney General may seek penalties from vendors.',
      sourceIds: ['L5a', 'L9'],
    },
    {
      id: 'ct-foia',
      title: 'Asking a Connecticut agency',
      body:
        'Requests to a Connecticut town or state agency start with the Connecticut Freedom of Information Act (Chapter 14, including § 1-210), not federal FOIA. Given Sec. 13(e), a request for plate-reader camera locations, data from system audits, and usage and access logs (with plate data redacted) is a reasonable starting point. Also useful: the agency’s adopted plate-reader policy (due January 1, 2027), the statewide model policy, annual usage reports, vendor contracts and any out-of-state sharing declarations. Do not ask for raw plate data, which is confidential (except data about your own vehicle). If an agency does not respond within four business days, that counts as a denial, and you may appeal to the Freedom of Information Commission within thirty days. Agencies may still claim exemptions, such as the safety-risk exemption in § 1-210(b)(19), and fees can apply.',
      sourceIds: ['L4a', 'L4b', 'L5a', 'L9'],
    },
    {
      id: 'ct-litigation',
      title: 'Federal lawsuit',
      body:
        'On May 15, 2026 the United States sued Connecticut (United States v. Connecticut, D. Conn. No. 3:26-cv-758), asking the court to declare Sections 3, 4, 5 and 6 of the act invalid as applied to federal agencies and officers under the Supremacy Clause, and reserving the right to challenge other parts. The plate-reader rules in Section 13 are not challenged. A hearing was held in early September 2026; we found no ruling as of October 6, 2026.',
      sourceIds: ['L8'],
    },
    {
      id: 'ct-status',
      title: 'Research status',
      body:
        'Read: the official PDF of Public Act 26-14 (42 pages) and the Office of Legislative Research summary, retrieved October 6, 2026; the federal complaint; and the Massimino opinion. The legislature’s website served an incomplete TLS certificate chain during retrieval; the act’s SHA-256 is recorded in the source register so you can compare it with a copy you download. As of October 6, 2026: no amendment found; no ruling in the federal case. Not verified: codified statute text. Not reviewed by a lawyer.',
      sourceIds: ['L5a', 'L5b', 'L9', 'L8', 'L7'],
    },
  ],
  sourceIds: ['L5a', 'L5b', 'L9', 'L10', 'L7', 'L8', 'L4a', 'L4b'],
  sourceCheckedAt: LEGAL_CHECKED_AT,
  effectiveDateNotes: 'Sec. 10 and Sec. 13 effective from passage (approved May 4, 2026); Sec. 13 retention rule operative October 1, 2026; policy deadline January 1, 2027.',
  reviewStatus: 'not_attorney_reviewed',
  validationStatus: VALIDATION,
};

export const STATE_ALPR_ARTICLE: LegalArticle = {
  id: 'state-alpr-laws',
  jurisdiction: 'State ALPR laws',
  title: 'State laws on license-plate readers',
  subtitle: `${ALPR_LAWS.length} states have laws that specifically regulate plate readers. Summaries are partial — read the statute.`,
  lead:
    'These laws govern how agencies (and in some states private operators) may use plate readers and how long they keep data. They do not restrict you from photographing a camera from public ground. A state missing from this list may still regulate plate readers through other laws, agency policy or regulation. Retention periods are the general rule; most states allow longer retention for evidence, warrants or active investigations.',
  sections: ALPR_LAWS.map((l) => ({
    id: `alpr-${l.code.toLowerCase()}`,
    title: `${l.state} — ${l.statute}`,
    body: `${l.summary} Retention: ${l.retention}.${l.verified ? '' : ' (Could not be confirmed against the official text; treat as unverified.)'}`,
    sourceIds: [`ALPR-${l.code}`],
  })),
  sourceIds: ALPR_LAWS.map((l) => `ALPR-${l.code}`),
  sourceCheckedAt: LEGAL_CHECKED_AT,
  effectiveDateNotes: 'Statutes as found on October 6, 2026; several were enacted or amended in 2025–2026.',
  reviewStatus: 'not_attorney_reviewed',
  validationStatus: VALIDATION,
};

/** Fallback box required by spec if enacted text could not be validated. */
export const CT_FALLBACK_BOX =
  'Connecticut changed relevant law in 2026. Current state-specific details need confirmation; see the official resources below.';

export const LEGAL_ARTICLES = [US_OVERVIEW, CT_SUPPLEMENT, STATE_ALPR_ARTICLE];
