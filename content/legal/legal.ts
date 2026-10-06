/**
 * Legal information content. NOT legal advice. NOT attorney-reviewed.
 * The U.S. overview reproduces the build specification's §14 copy (citations preserved).
 * The Connecticut supplement summarises Public Act 26-14 as read from the official PDF
 * (SHA-256 614c5c38e44e76c89410a73aed4ba44fdd7f97b646046fa1a8e731c1b061f076, retrieved 2026-10-06).
 * Subsequent amendments, court orders and litigation status were NOT verified.
 */
import type { LegalArticle } from '../../src/domain/schemas';

export const LEGAL_CHECKED_AT = '2026-10-06T00:00:00.000Z';

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
      body: "The ACLU explains that photographing things visible in public spaces is generally constitutionally protected. Public visibility is not permission to enter someone else's property: a camera visible from a sidewalk and a camera inside a restricted area present different access questions. Sightline is built around observation from lawful vantage points. Property rules, restricted facilities and valid safety restrictions still matter.",
      sourceIds: ['L1', 'L3'],
    },
    {
      id: 'recording-government',
      title: 'Recording government activity',
      body: 'In Fields v. City of Philadelphia (Third Circuit, 2017), the court recognized First Amendment protection for recording officers performing public duties. It also explained that this right is subject to limits, including reasonable time, place and manner restrictions and interference concerns. This is an important example of the legal framework; it is not a Supreme Court ruling about every surveillance map or automatic nationwide permission for every recording.',
      sourceIds: ['L2'],
    },
    {
      id: 'reading-sharing',
      title: 'Reading and sharing sources',
      body: "The app supports public understanding by distinguishing a document's contents, an observation and an inference. Use sources you are entitled to access, credit licensed datasets and photographs appropriately, and describe uncertainty. A map pin does not establish that its owner acted illegally or recorded you. The right to discuss surveillance does not erase privacy, copyright or other applicable obligations.",
      sourceIds: ['D2'],
    },
    {
      id: 'not-authorized',
      title: 'What the app does not authorize',
      body: 'Do not trespass, interfere with officers or traffic, damage or obstruct equipment, or access a system without authorization. Still photography and recording a private conversation are not the same legal issue; audio-recording rules vary. The core capture flow takes photographs and does not request microphone access. Do not use this tool to harass people or publish unsupported accusations.',
      sourceIds: ['L3'],
    },
    {
      id: 'public-records',
      title: 'Public records',
      body: 'Public-records laws can help you learn which agency bought a system and what policies govern it. For Connecticut agencies, the relevant starting point is the Connecticut Freedom of Information Act, including section 1-210; federal FOIA is not the default law for a town police department. Exemptions, redactions and fees can apply. The request builder prepares a draft for you to review and send; it does not guarantee disclosure.',
      sourceIds: ['L4a', 'L4b'],
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
      body: "Your right to document and discuss equipment, the license terms of a dataset you reuse, and whether an operator's deployment is lawful are separate questions. First Amendment protections for observing and speaking are distinct from Fourth Amendment limits on government tracking. A court decision about police use of plate readers does not give you any particular immunity.",
      sourceIds: ['L1', 'L2', 'D2'],
    },
    {
      id: 'jurisdiction',
      title: 'Jurisdiction and updates',
      body: 'This overview concerns the United States. Rules can differ by state and place and change over time. Read the linked sources and seek local legal advice for a specific dispute. Each article shows when its sources were checked. No reviewed guidance is provided here for other countries.',
      sourceIds: [],
    },
  ],
  sourceIds: ['L1', 'L2', 'L3', 'L4a', 'L4b', 'D2'],
  sourceCheckedAt: LEGAL_CHECKED_AT,
  effectiveDateNotes: 'General U.S. overview; not tied to a single statute effective date.',
  reviewStatus: 'not_attorney_reviewed',
  validationStatus: 'Copy from build specification §14; citations linked; not attorney-reviewed.',
};

export const CT_SUPPLEMENT: LegalArticle = {
  id: 'ct-supplement',
  jurisdiction: 'Connecticut',
  title: 'Connecticut: what changed in 2026',
  subtitle: 'Public Act 26-14 (Substitute S.B. 397), approved May 4, 2026 — summary of the enacted text.',
  lead:
    'Connecticut changed relevant law in 2026. Below is a plain-language summary of sections we read in the official enacted text. We did not verify later amendments, court orders or litigation, and no attorney has reviewed this page. Read the official act before relying on any detail.',
  sections: [
    {
      id: 'ct-recording-officers',
      title: 'Recording peace officers (Sec. 10, amending § 52-571j; effective from passage)',
      body:
        "The act amends section 52-571j. An employer of a peace officer who interferes with a person taking a photo or video of an officer performing their duties can be liable to that person in a civil action. The amended definition of “peace officer” no longer excludes federal special agents (tribal law-enforcement units remain excluded). The employer is not liable if the officer had reasonable grounds to believe the interference was needed to lawfully enforce a criminal law or ordinance, protect public safety, preserve a crime scene or investigation, safeguard someone's privacy (including a crime victim), or enforce Judicial Branch rules on recording in court facilities. An officer found to have committed certain intentional torts (assault, battery, false imprisonment, false arrest, abuse of process or malicious prosecution) while interfering with such recording may not assert privilege or immunity against civil liability. This is a civil remedy; it does not authorize interfering with officers, traffic or a scene.",
      sourceIds: ['L5a'],
    },
    {
      id: 'ct-alpr-records',
      title: 'Plate-reader camera locations are public records (Sec. 13(e))',
      body:
        'Plate-reader data itself (plate characters, vehicle images, location and time data) is confidential and not a public record under the Freedom of Information Act. However, the act deems the locations of cameras used as part of a plate-reader system to be public records — except where the camera purchase was funded at least in part by the U.S. Department of Homeland Security on the condition that its location not be disclosed. Audit data, usage logs and access logs are also public records, with plate-reader data redacted. A registered owner may request plate-reader data about their own vehicle from the contracting agency (with the consent of any co-registrant).',
      sourceIds: ['L5a', 'L4a'],
    },
    {
      id: 'ct-alpr-retention',
      title: 'Plate-reader retention and sharing limits (Sec. 13; operative October 1, 2026)',
      body:
        'On and after October 1, 2026, plate-reader data held by a public agency or its contracted vendor generally may not be kept longer than twenty-one days (or a shorter contractual period), with listed exceptions such as a warrant or court order, active criminal investigations or prosecutions, and highway-usage-fee collection. The section also limits uses — including prohibitions connected to immigration enforcement, protected First Amendment activity, and reproductive or gender-affirming health care — and restricts sharing with agencies outside Connecticut. Systems that only provide evidence for enforcement offenses (for example automated traffic-enforcement, work-zone speed and school-bus violation cameras) are excluded from the act’s plate-reader definition. Non-law-enforcement agencies that operate plate readers must adopt and publicize a usage policy by January 1, 2027.',
      sourceIds: ['L5a'],
    },
    {
      id: 'ct-foia',
      title: 'Asking a Connecticut agency',
      body:
        'Requests to a Connecticut town or state agency start with the Connecticut Freedom of Information Act (Chapter 14, including § 1-210), not federal FOIA. Given Sec. 13(e), a request for plate-reader camera locations, audit reports and usage/access logs is a reasonable starting point. Fees, exemptions and redactions can still apply.',
      sourceIds: ['L4a', 'L4b', 'L5a'],
    },
    {
      id: 'ct-status',
      title: 'Research status',
      body:
        'Read: official PDF of Public Act 26-14 (42 pages), retrieved October 6, 2026. The CGA website served an incomplete TLS certificate chain during retrieval; the file’s SHA-256 is recorded in the source register so it can be compared with a copy you download. Not verified: codified statute text, later amendments, court orders, injunctions or litigation. Not attorney-reviewed.',
      sourceIds: ['L5a', 'L5b', 'L6'],
    },
  ],
  sourceIds: ['L5a', 'L5b', 'L6', 'L4a', 'L4b'],
  sourceCheckedAt: LEGAL_CHECKED_AT,
  effectiveDateNotes: 'Sec. 10 and Sec. 13 effective from passage (approved May 4, 2026); Sec. 13 retention rule operative October 1, 2026; Sec. 13(f) policy deadline January 1, 2027.',
  reviewStatus: 'not_attorney_reviewed',
  validationStatus: 'Summarised from official enacted text (hash recorded). Subsequent orders/amendments not checked.',
};

/** Fallback box required by spec if enacted text could not be validated. */
export const CT_FALLBACK_BOX =
  'Connecticut changed relevant law in 2026. Current state-specific details need confirmation; see the official resources below.';

export const LEGAL_ARTICLES = [US_OVERVIEW, CT_SUPPLEMENT];
