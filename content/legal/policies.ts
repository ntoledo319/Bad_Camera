/**
 * Privacy policy and terms of use — single source for the app (Settings → Privacy policy & terms)
 * and the data site (privacy.html, terms.html). Keep statements true to the code: see
 * docs/DECISIONS.md D8 (storage), D14 (permissions), D6 (network).
 */
export const POLICY_EFFECTIVE = '2026-10-06';
export const POLICY_CONTACT = 'https://github.com/ntoledo319/Bad_Camera/issues';

export interface PolicySection {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}
export interface PolicyDoc {
  id: 'privacy' | 'terms';
  title: string;
  summary?: string;
  sections: PolicySection[];
}

export const PRIVACY_POLICY: PolicyDoc = {
  id: 'privacy',
  title: 'Privacy policy',
  summary: 'Sightline has no accounts, no analytics, no ads and no servers that receive your data. Your notebook stays on your device unless you export it yourself.',
  sections: [
    {
      title: 'What stays on your device',
      bullets: [
        "Observations, photos, notes, bookmarks, collections and settings are stored only in the app's private storage on your device. Photo files are encrypted on iPhone and Android; the notebook database itself is protected by the operating system's app sandbox but is not separately encrypted.",
        'We (the developers) cannot see, recover or delete anything in your notebook. Deleting a record or the app removes it from the device.',
        'Encrypted backups are files you create and store where you choose. We never receive them or your passphrase.',
      ],
    },
    {
      title: 'What leaves your device, and to whom',
      bullets: [
        'Map background tiles from OpenFreeMap (openfreemap.org) while the map is visible. That provider sees your IP address and the map area you view. Off in offline-only mode.',
        'Camera data, only when you tap Download or Refresh: tiles from the Sightline data site (hosted on Cloudflare Pages, which sees your IP address and which tiles are requested), or, if you choose it after the site fails, one query for the visible map area to the public OpenStreetMap Overpass service (overpass-api.de). Your location is not sent — only the map area.',
        'Files you share or save go wherever you send them through your device’s share sheet. Default exports leave out your position, exact time, private notes and photo metadata; you choose what to include.',
        'Links you open (sources, system maps) open in other apps, which have their own policies.',
      ],
    },
    {
      title: 'Permissions',
      paragraphs: [
        'Camera — only when you tap Take a photo. Location — only while the app is open and only when you ask for distances or record where you stood; never in the background. Photos — through the system picker for images you choose. Face ID / fingerprint — only if you turn on App lock. Sightline does not use the microphone, contacts, Bluetooth, Wi-Fi scanning or advertising identifiers.',
      ],
    },
    {
      title: 'The data website',
      paragraphs: ['The Sightline data site has no cookies, scripts or analytics. Cloudflare, its host, processes request logs (such as IP addresses) to deliver and protect the site under its own privacy policy.'],
    },
    { title: 'Children', paragraphs: ['Sightline is not directed to children under 13 and does not knowingly collect personal information from anyone.'] },
    {
      title: 'Your choices and rights',
      paragraphs: ['Because we hold no personal data about you, there is nothing for us to access, correct, sell or delete. You control your data on your device. State privacy laws (for example in California) give residents rights over personal data a business holds; Sightline holds none.'],
    },
    { title: 'Changes and contact', paragraphs: [`We will post changes with a new effective date. Questions: open an issue at ${POLICY_CONTACT}.`] },
  ],
};

export const TERMS_OF_USE: PolicyDoc = {
  id: 'terms',
  title: 'Terms of use',
  sections: [
    {
      title: 'What Sightline is',
      paragraphs: [
        'Sightline is a free tool for looking up publicly mapped surveillance equipment, documenting equipment you can see from public places, and keeping your own private records. It shows community-mapped reports and general legal information. It is not legal advice, not a security service, and not a way to access any camera, feed or database.',
      ],
    },
    {
      title: 'Information is provided as is',
      paragraphs: [
        'Map records come from OpenStreetMap volunteers and can be wrong, out of date or missing. Identification aids describe what manufacturers say about their products and what is visible; they cannot establish who operates a device, whether it is recording, or what happens to its data. Legal articles are general information researched from public sources; they are not reviewed by a lawyer and do not create an attorney-client relationship. Laws differ by place and change. For a specific situation, consult a lawyer or a legal-aid organization.',
      ],
    },
    {
      title: 'Use it lawfully and safely',
      bullets: [
        'Observe and photograph only from places where you are allowed to be. Do not trespass, climb, touch, tamper with or obstruct equipment, interfere with police, traffic or emergency work, or put yourself in danger.',
        'Do not use Sightline to harass, stalk, threaten or identify private people, or to publish accusations that are not supported by evidence. A mapped camera is a report, not proof of wrongdoing.',
        'Before sharing photos, cover faces, license plates and other identifiers. You are responsible for what you publish and for having the rights to share your photos.',
      ],
    },
    {
      title: 'Data license',
      paragraphs: ['Camera data © OpenStreetMap contributors, under the Open Database License 1.0. If you redistribute a database derived from it, follow the ODbL. Your own photos and notes remain yours.'],
    },
    { title: 'Trademarks', paragraphs: ['Product and company names are used only to identify equipment and belong to their owners. No affiliation or endorsement is implied.'] },
    {
      title: 'No warranty; limitation of liability',
      paragraphs: [
        'Sightline is provided free of charge, “as is” and “as available”, without warranties of any kind, to the fullest extent the law allows. To the fullest extent the law allows, the developers are not liable for any indirect, incidental or consequential damages, or for decisions made based on the app’s information. Some places do not allow these limits, so they may not apply to you.',
      ],
    },
    { title: 'Changes and contact', paragraphs: [`We may update these terms and will post changes with a new effective date. Questions: ${POLICY_CONTACT}.`] },
  ],
};
