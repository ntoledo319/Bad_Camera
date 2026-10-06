/**
 * Content checks (offline by default; pass --links to also HEAD/GET-check source URLs and write docs/LINK_CHECK.md).
 * - Catalog / legal / sources validate against schemas
 * - Every cited source ID exists; no duplicate IDs
 * - Bundled region parses; claims reference existing installations and sources
 * - Copy guardrails: banned overclaiming phrases absent from UI and content
 * - Design-token contrast (WCAG) via contrast.ts
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOG } from '../../content/catalog/catalog';
import { LEGAL_ARTICLES } from '../../content/legal/legal';
import { SOURCE_REGISTER, SOURCE_BY_ID } from '../../content/sources';
import { CatalogEntry, LegalArticle, Source } from '../../src/domain/schemas';
import { loadBundled } from '../../src/data/publicData';
import { SCHEMATICS } from '../../src/domain/schematics';

let fail = 0;
const ok = (cond: boolean, msg: string) => {
  if (!cond) {
    fail++;
    console.log(`FAIL  ${msg}`);
  }
};

// Schemas
for (const e of CATALOG) ok(CatalogEntry.safeParse(e).success, `catalog ${e.id} schema`);
for (const a of LEGAL_ARTICLES) ok(LegalArticle.safeParse(a).success, `legal ${a.id} schema`);
for (const s of SOURCE_REGISTER) ok(Source.safeParse(s).success, `source ${s.id} schema`);
ok(new Set(CATALOG.map((e) => e.id)).size === CATALOG.length, 'catalog ids unique');
ok(new Set(SOURCE_REGISTER.map((s) => s.id)).size === SOURCE_REGISTER.length, 'source ids unique');

// Citations
for (const e of CATALOG) {
  for (const id of e.sourceIds) ok(!!SOURCE_BY_ID[id], `catalog ${e.id} cites missing source ${id}`);
  ok(e.sourceIds.length > 0 || e.kind === 'generic', `catalog ${e.id} has at least one source`);
  ok(!!SCHEMATICS[e.schematic], `catalog ${e.id} schematic ${e.schematic} exists`);
  for (const l of e.lookalikes) ok(typeof l === 'string', `catalog ${e.id} lookalike`);
}
for (const a of LEGAL_ARTICLES) {
  for (const id of a.sourceIds) ok(!!SOURCE_BY_ID[id], `legal ${a.id} cites missing ${id}`);
  for (const s of a.sections) for (const id of s.sourceIds) ok(!!SOURCE_BY_ID[id], `legal ${a.id}/${s.id} cites missing ${id}`);
  ok(a.reviewStatus === 'not_attorney_reviewed', `legal ${a.id} honestly marked not attorney-reviewed`);
}

// Region data
const r = loadBundled();
const instIds = new Set(r.installations.map((i) => i.id));
const srcIds = new Set(r.sources.map((s) => s.id));
ok(r.installations.length === r.manifest.recordCount, `region recordCount ${r.manifest.recordCount} == installations ${r.installations.length}`);
for (const c of r.claims) {
  ok(instIds.has(c.subjectId), `claim ${c.id} subject exists`);
  ok(srcIds.has(c.sourceId), `claim ${c.id} source exists`);
}
for (const i of r.installations) ok(!i.isDemo, `region installation ${i.id} is not demo`);

// Copy guardrails (spec: no overclaiming)
const BANNED = [/production[- ]ready/i, /\bproves? (that )?(you|the camera) (were|was) recorded/i, /legally admissible/i, /court[- ]ready/i, /tamper[- ]proof/i, /\bguarantee(d)? (privacy|anonymity)/i, /successfully shared/i];
function walk(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|json)$/.test(f)) out.push(p);
  }
  return out;
}
const files = [...walk('src'), ...walk('content/catalog'), ...walk('content/legal')];
for (const f of files) {
  const t = readFileSync(f, 'utf8');
  for (const b of BANNED) {
    const m = t.match(b);
    // Allowed only inside an explicit negation (e.g. "does not certify", "never say").
    if (m) {
      const ctx = t.slice(Math.max(0, (m.index ?? 0) - 60), (m.index ?? 0) + m[0].length);
      ok(/\b(not|never|no|doesn.t|isn.t)\b/i.test(ctx), `banned phrase "${m[0]}" in ${f}`);
    }
  }
}

console.log(`content: ${CATALOG.length} catalog entries, ${LEGAL_ARTICLES.length} legal articles, ${SOURCE_REGISTER.length} sources, ${r.installations.length} installations, ${r.claims.length} claims, ${files.length} files scanned`);

async function links() {
  const rows: string[] = ['# Link check', '', `Run: ${new Date().toISOString()} (tools/content-check/check.ts --links)`, '', '| ID | Status | URL |', '|---|---|---|'];
  for (const s of SOURCE_REGISTER) {
    if (!s.url) continue;
    let status = '';
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 15000);
      const res = await fetch(s.url, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (Sightline link check)' } });
      clearTimeout(t);
      status = String(res.status);
    } catch (e) {
      status = `error: ${((e as Error).cause as Error)?.message ?? (e as Error).message}`.slice(0, 60);
    }
    rows.push(`| ${s.id} | ${status} | ${s.url} |`);
    console.log(s.id, status);
  }
  rows.push('', 'Non-200 results can be bot-blocking (403), TLS chain problems or real breakage; each is reviewed manually before relying on the source.');
  writeFileSync('docs/LINK_CHECK.md', rows.join('\n') + '\n');
}

(async () => {
  const { contrastFailures } = await import('./contrast');
  ok(contrastFailures === 0, 'design-token contrast');
  if (process.argv.includes('--links')) await links();
  if (fail) {
    console.log(`content check: ${fail} failure(s)`);
    process.exit(1);
  }
  console.log('content check: PASS');
})();
