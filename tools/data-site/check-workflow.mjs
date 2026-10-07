// Structural check of .github/workflows/data-site.yml (does not run it).
// Usage: node tools/data-site/check-workflow.mjs [path]   → prints WORKFLOW STRUCTURE VERIFIED
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const path = process.argv[2] ?? '.github/workflows/data-site.yml';
const wf = parse(readFileSync(path, 'utf8'));
const errs = [];
const need = (ok, msg) => ok || errs.push(msg);

const on = wf.on ?? wf[true]; // YAML 1.1 parsers may read `on` as boolean true
need(Array.isArray(on?.schedule) && on.schedule.some((s) => /^\S+ \S+ \* \* \*$/.test(s.cron)), 'needs a daily cron schedule');
need(on && 'workflow_dispatch' in on, 'needs a manual workflow_dispatch trigger');
need(wf.permissions?.contents === 'read' && Object.keys(wf.permissions).length === 1, 'permissions must be contents: read only');
const job = Object.values(wf.jobs ?? {})[0];
need(job, 'needs a job');
const steps = job?.steps ?? [];
const run = (re) => steps.find((s) => typeof s.run === 'string' && re.test(s.run));
need(job?.env?.CLOUDFLARE_API_TOKEN === '${{ secrets.CLOUDFLARE_API_TOKEN }}', 'API token must come from secrets');
need(job?.env?.CLOUDFLARE_ACCOUNT_ID === '${{ secrets.CLOUDFLARE_ACCOUNT_ID }}', 'account id must come from secrets');
need(run(/^npm ci$/), 'needs npm ci');
const build = run(/tools\/data-site\/build\.ts/);
need(build && /--previous/.test(build.run), 'build step must pass --previous so failed areas keep the published copy');
const verify = steps.findIndex((s) => /verify-site\.ts --dir/.test(s.run ?? ''));
const deploy = steps.findIndex((s) => /wrangler@\d+ pages deploy data-site\/dist/.test(s.run ?? ''));
need(verify >= 0, 'needs a local verify step');
need(deploy > verify, 'deploy must come after verify');
need(deploy >= 0 && /CLOUDFLARE_API_TOKEN != ''/.test(steps[deploy].if ?? ''), 'deploy must be skipped when secrets are absent');
need(steps.some((s) => /verify-site\.ts --remote/.test(s.run ?? '')), 'needs a post-deploy remote verify');
need(steps.some((s) => String(s.uses ?? '').startsWith('actions/upload-artifact') && /== ''/.test(s.if ?? '')), 'needs artifact fallback without secrets');
need(Number(job?.['timeout-minutes']) > 0 && Number(job['timeout-minutes']) <= 360, 'needs a job timeout within the 6 h limit');
need(!/\$\{\{\s*secrets\.[A-Z_]+\s*\}\}/.test(steps.map((s) => s.run ?? '').join('\n')), 'secrets must not be interpolated into shell commands');

if (errs.length) {
  for (const e of errs) console.log('FAIL', e);
  process.exit(1);
}
console.log(`${path}: ${steps.length} steps, cron ${on.schedule[0].cron}`);
console.log('WORKFLOW STRUCTURE VERIFIED');
