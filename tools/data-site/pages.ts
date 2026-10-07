/**
 * HTML pages for the data site: landing page with live stats, privacy policy, terms of use.
 * Plain static HTML, no scripts, no trackers, no external fonts.
 */
import type { SiteManifest } from '../../src/domain/tiles';
import { POLICY_EFFECTIVE, PRIVACY_POLICY, TERMS_OF_USE, type PolicyDoc } from '../../content/legal/policies';

const REPO = 'https://github.com/ntoledo319/Bad_Camera';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function shell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="Sightline: public camera-transparency data from OpenStreetMap, privacy policy and terms.">
<style>
:root{--canvas:#F6F4EE;--surface:#FFFFFF;--text:#172624;--text2:#536560;--border:#DCE3DC;--primary:#14675F;--caution:#8C5A12;--cautionBg:#FFF1D3}
@media (prefers-color-scheme:dark){:root{--canvas:#101A18;--surface:#192623;--text:#EEF4EF;--text2:#B3C2B9;--border:#35483F;--primary:#8FD8C1;--caution:#E4BD73;--cautionBg:#3A2E16}}
*{box-sizing:border-box}body{margin:0;background:var(--canvas);color:var(--text);font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
main{max-width:720px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:32px;line-height:1.2;margin:8px 0 8px}h2{font-size:22px;margin:32px 0 8px}h3{font-size:18px;margin:20px 0 4px}
p,li{color:var(--text)}.muted{color:var(--text2);font-size:14px}a{color:var(--primary)}
.card{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:16px 20px;margin:16px 0}
.note{background:var(--cautionBg);color:var(--caution);border-radius:12px;padding:12px 16px}
.brand{display:flex;align-items:center;gap:8px;font-weight:700;color:var(--primary);text-decoration:none}
nav{display:flex;gap:16px;flex-wrap:wrap;margin-top:8px;font-size:14px}
table{border-collapse:collapse;width:100%;font-size:14px;font-variant-numeric:tabular-nums}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--border)}
code{font-size:13px;word-break:break-all}
</style>
</head>
<body><main>
<a class="brand" href="/">Sightline</a>
<nav><a href="/">Data</a><a href="/privacy.html">Privacy</a><a href="/terms.html">Terms</a><a href="${REPO}">Source code</a></nav>
${body}
<p class="muted" style="margin-top:48px">Camera data © OpenStreetMap contributors, available under the Open Database License (ODbL 1.0). Sightline is not affiliated with OpenStreetMap or any camera manufacturer.</p>
</main></body></html>
`;
}

function index(m: SiteManifest): string {
  const fresh = m.regions.filter((r) => r.status === 'fresh').length;
  const notFresh = m.regions.filter((r) => r.status !== 'fresh');
  const rows = [...m.regions]
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 25)
    .map((r) => `<tr><td>${esc(r.name.replace(/ area$/, ''))}</td><td>${r.count.toLocaleString('en-US')}</td></tr>`)
    .join('');
  const stale = notFresh.length
    ? `<p class="muted">Not refreshed in this build (previous copy kept where one existed): ${notFresh.map((r) => `${esc(r.name)} (${r.status === 'kept-previous' ? 'kept' : 'empty'})`).join(', ')}.</p>`
    : '<p class="muted">Every area was refreshed in this build.</p>';
  return shell(
    'Sightline camera data',
    `<h1>Public camera data</h1>
<p>Community-mapped surveillance cameras, plate readers and enforcement cameras across the United States (plus border areas of Canada and Mexico), taken from OpenStreetMap and refreshed automatically every day. The Sightline app downloads small map tiles from here only when you ask it to.</p>
<div class="card">
<p><strong>${m.totalRecords.toLocaleString('en-US')}</strong> mapped records in <strong>${m.tiles.length.toLocaleString('en-US')}</strong> tiles.</p>
<p class="muted">Built ${esc(m.generatedAt.slice(0, 16).replace('T', ' '))} UTC from OpenStreetMap data as of ${esc((m.upstreamTimestamp ?? 'unknown').replace('T', ' ').replace('Z', ' UTC'))}. ${fresh} of ${m.regions.length} map areas refreshed in this build.</p>
</div>
<p class="note">A mapped record is a public report, not proof that a device exists, is operating, or recorded anyone. Many cameras are not mapped; an empty area does not mean no cameras.</p>
<h2>Use the data</h2>
<p>Index: <a href="/v1/manifest.json"><code>/v1/manifest.json</code></a> — lists every tile with its bounding box, record count, size and SHA-256. Each tile (<code>/v1/tiles/&lt;id&gt;.json</code>) holds OpenStreetMap elements: id, coordinates, version, edit time and tags. Mapper usernames are removed.</p>
<p>This is a derived database of OpenStreetMap and is offered under the <a href="${esc(m.licenseUrl)}">Open Database License 1.0</a>. If you publish a database made from it, keep the attribution “© OpenStreetMap contributors” and share it under the ODbL. See <a href="/ATTRIBUTION.txt">ATTRIBUTION.txt</a>.</p>
<p>Please fetch only the tiles you need and cache them. Normalization rules: <a href="${REPO}/blob/main/docs/SOURCES.md">docs/SOURCES.md</a> (version <code>${esc(m.normalizationVersion)}</code>).</p>
<h2>Most-mapped areas</h2>
<table><thead><tr><th>Area (2° grid cell, named after the nearest listed city)</th><th>Records</th></tr></thead><tbody>${rows}</tbody></table>
${stale}
<h2>Corrections</h2>
<p>Sightline does not edit the map. To fix a record, edit it on <a href="https://www.openstreetmap.org">OpenStreetMap</a>; the change reaches this site on the next automatic build.</p>`,
  );
}

function policyPage(doc: PolicyDoc): string {
  const linkify = (t: string) => esc(t).replace(/(https:\/\/[^\s,)]+[^\s,.)])/g, '<a href="$1">$1</a>');
  const body = doc.sections
    .map((sec) => `<h2>${esc(sec.title)}</h2>${(sec.paragraphs ?? []).map((p) => `<p>${linkify(p)}</p>`).join('')}${sec.bullets ? `<ul>${sec.bullets.map((x) => `<li>${linkify(x)}</li>`).join('')}</ul>` : ''}`)
    .join('\n');
  return shell(
    `Sightline ${doc.title.toLowerCase()}`,
    `<h1>${esc(doc.title)}</h1>
<p class="muted">Effective ${POLICY_EFFECTIVE}. Applies to the Sightline app for iPhone and Android, its browser preview, and this website.</p>
${doc.summary ? `<div class="card"><p><strong>Short version:</strong> ${esc(doc.summary)}</p></div>` : ''}
${body}`,
  );
}

export function renderPages(m: SiteManifest): Record<string, string> {
  return { 'index.html': index(m), 'privacy.html': policyPage(PRIVACY_POLICY), 'terms.html': policyPage(TERMS_OF_USE) };
}
