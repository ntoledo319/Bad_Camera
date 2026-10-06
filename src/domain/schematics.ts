/**
 * Original line-drawing schematics (viewBox 0 0 200 200). Illustrative aids only — not
 * evidence photos and not depictions of any vendor's trade dress.
 */
const S = 'fill="none" stroke="#14675F" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"';
const T = 'fill="none" stroke="#536560" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 8"';
const ground = `<path d="M20 186h160" ${S} opacity="0.4"/>`;

export const SCHEMATICS: Record<string, string> = {
  'solar-box-pole': `${ground}<path d="M100 186V40" ${S}/><path d="M70 30l60-12v14l-60 12z" ${S}/><path d="M100 36v8" ${S}/><rect x="104" y="70" width="44" height="26" rx="6" ${S}/><circle cx="140" cy="83" r="5" ${S}/><path d="M100 82h4" ${S}/><path d="M152 83l26 8" ${T}/>`,
  'box-pole': `${ground}<path d="M100 186V40" ${S}/><rect x="104" y="60" width="50" height="28" rx="6" ${S}/><circle cx="146" cy="74" r="5" ${S}/><path d="M100 74h4" ${S}/>`,
  'bullet-pole': `${ground}<path d="M100 186V40" ${S}/><path d="M104 70h40a10 10 0 0 1 0 20h-40z" ${S}/><path d="M100 80h4" ${S}/><path d="M104 64h46" ${S}/>`,
  'dome-pole': `${ground}<path d="M100 186V40" ${S}/><path d="M100 50h40v10" ${S}/><path d="M124 60h32a16 16 0 0 1-32 0z" ${S}/><circle cx="140" cy="66" r="4" ${S}/>`,
  streetlight: `${ground}<path d="M70 186V40q0-12 12-12h60" ${S}/><path d="M132 28h28l-6 10h-16z" ${S}/><rect x="74" y="80" width="34" height="22" rx="5" ${S}/><circle cx="102" cy="91" r="4" ${S}/>`,
  'sensor-box': `${ground}<path d="M100 186V40" ${S}/><rect x="104" y="64" width="34" height="40" rx="6" ${S}/><path d="M112 76h18M112 84h18M112 92h18" ${S} opacity="0.6"/><path d="M146 70q8 14 0 28M154 64q14 20 0 40" ${T}/>`,
  gantry: `${ground}<path d="M30 186V50h140v136" ${S}/><path d="M30 64h140" ${S}/><rect x="70" y="68" width="22" height="16" rx="4" ${S}/><rect x="110" y="68" width="22" height="16" rx="4" ${S}/>`,
  trailer: `${ground}<path d="M40 160h110v-20H40z" ${S}/><circle cx="70" cy="170" r="12" ${S}/><circle cx="120" cy="170" r="12" ${S}/><path d="M150 152h24" ${S}/><path d="M95 140V40" ${S}/><path d="M68 34l54-10v12l-54 10z" ${S}/><rect x="99" y="60" width="30" height="20" rx="5" ${S}/>`,
  vehicle: `${ground}<path d="M24 150h152v-26l-26-6-20-26H70l-24 26-22 6z" ${S}/><circle cx="60" cy="156" r="14" ${S}/><circle cx="140" cy="156" r="14" ${S}/><rect x="84" y="80" width="32" height="10" rx="4" ${S}/>`,
  network: `<circle cx="100" cy="100" r="16" ${S}/><circle cx="40" cy="50" r="10" ${S}/><circle cx="160" cy="50" r="10" ${S}/><circle cx="40" cy="150" r="10" ${S}/><circle cx="160" cy="150" r="10" ${S}/><path d="M48 56l40 34M152 56l-40 34M48 144l40-34M152 144l-40-34" ${T}/>`,
  relationship: `<circle cx="50" cy="140" r="10" fill="none" stroke="#536560" stroke-width="4"/><path d="M42 160h16" stroke="#536560" stroke-width="4"/><path d="M150 60l-10 -18h20z" fill="#14675F"/><circle cx="150" cy="70" r="12" fill="none" stroke="#14675F" stroke-width="4"/><path d="M58 132L140 76" ${T}/>`,
};

export function schematicFor(id: string | undefined | null): string {
  return (id && SCHEMATICS[id]) || SCHEMATICS['dome-pole'];
}
