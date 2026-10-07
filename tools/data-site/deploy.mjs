#!/usr/bin/env node
// One-shot setup and deploy of the camera-data site to Cloudflare Pages (free plan).
//
//   npm run data:deploy              # log in (browser), create project, deploy, verify,
//                                    # then store the GitHub secrets for daily auto-updates
//   npm run data:deploy -- --dry-run # check everything, deploy nothing
//   npm run data:deploy -- --rebuild # rebuild data-site/dist from OpenStreetMap first
//
// Needs: Node 20+, network, the GitHub CLI (`gh`) logged in to this repo, and a Cloudflare
// account (free). Wrangler is run through npx; nothing is installed globally.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');
const PROJECT = process.env.CF_PAGES_PROJECT ?? 'sightline-data';
const SITE = process.env.DATA_SITE_URL ?? `https://${PROJECT}.pages.dev`;
const WRANGLER = ['--yes', 'wrangler@4'];
const TOKEN_URL =
  'https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=' +
  encodeURIComponent(JSON.stringify([{ key: 'page', type: 'edit' }])) +
  '&name=' +
  encodeURIComponent('Sightline data site (GitHub Actions)');

const step = (m) => console.log(`\n▸ ${m}`);
const run = (cmd, a, opts = {}) => {
  const r = spawnSync(cmd, a, { stdio: opts.capture ? 'pipe' : 'inherit', encoding: 'utf8', env: { ...process.env, ...(opts.env ?? {}) }, input: opts.input });
  if (opts.allowFail) return r;
  if (r.status !== 0) {
    console.error(`\n✗ ${cmd} ${a.join(' ')} failed${r.stderr ? `:\n${r.stderr.slice(-800)}` : ''}`);
    process.exit(1);
  }
  return r;
};
const ask = (q, hidden = false) =>
  new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (s) => rl.output.write(s.includes(q) ? s : '');
    rl.question(q, (a) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      res(a.trim());
    });
  });

const problems = [];
step('Checking prerequisites');
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) problems.push(`Node 20+ required (found ${process.versions.node})`);
const gh = run('gh', ['auth', 'status'], { capture: true, allowFail: true });
if (gh.status !== 0) problems.push('GitHub CLI is not logged in — run `gh auth login`');
const repo = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], { capture: true, allowFail: true }).stdout?.trim();
if (!repo) problems.push('could not resolve the GitHub repository for this folder');
const wv = run('npx', [...WRANGLER, '--version'], { capture: true, allowFail: true });
if (wv.status !== 0) problems.push('wrangler could not run through npx');
console.log(`node ${process.versions.node} · repo ${repo ?? '?'} · wrangler ${wv.stdout?.trim().split('\n').pop() ?? '?'} · project ${PROJECT} → ${SITE}`);

if (args.has('--rebuild') || !existsSync('data-site/dist/v1/manifest.json')) {
  if (DRY) problems.push('data-site/dist is missing — run `npm run data:build` (or pass --rebuild without --dry-run)');
  else {
    step('Building the site from OpenStreetMap (this takes a while)');
    run('npx', ['tsx', 'tools/data-site/build.ts', '--previous', SITE, '--pause', '1500']);
  }
}
if (existsSync('data-site/dist/v1/manifest.json')) {
  step('Verifying the built site');
  const v = run('npx', ['tsx', 'tools/data-site/verify-site.ts', '--dir', 'data-site/dist'], { capture: true, allowFail: true });
  console.log(v.stdout.trim().split('\n').slice(-2).join('\n'));
  if (v.status !== 0 || !/SITE VERIFIED/.test(v.stdout)) problems.push('local site verification failed');
}
const wf = run('node', ['tools/data-site/check-workflow.mjs'], { capture: true, allowFail: true });
if (!/WORKFLOW STRUCTURE VERIFIED/.test(wf.stdout ?? '')) problems.push('workflow file check failed');

if (problems.length) {
  for (const p of problems) console.log(`✗ ${p}`);
  process.exit(1);
}

if (DRY) {
  console.log(`\nWould: log in to Cloudflare, create Pages project "${PROJECT}" if missing, deploy data-site/dist,`);
  console.log(`verify ${SITE}, store CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID as secrets on ${repo}, and start the daily workflow.`);
  console.log('DEPLOY DRY RUN OK');
  process.exit(0);
}

step('Cloudflare login (a browser window opens if needed)');
const who = run('npx', [...WRANGLER, 'whoami'], { capture: true, allowFail: true });
if (who.status !== 0 || /not authenticated|not logged in/i.test(`${who.stdout}${who.stderr}`)) run('npx', [...WRANGLER, 'login']);
const whoText = run('npx', [...WRANGLER, 'whoami'], { capture: true }).stdout;
const accountId = (whoText.match(/\b[0-9a-f]{32}\b/) ?? [])[0];
if (!accountId) {
  console.error('✗ Could not read your Cloudflare account id from `wrangler whoami`.');
  process.exit(1);
}
console.log(`account ${accountId.slice(0, 6)}…`);

step(`Creating Pages project "${PROJECT}" (skipped if it exists)`);
const list = run('npx', [...WRANGLER, 'pages', 'project', 'list'], { capture: true, allowFail: true, env: { CLOUDFLARE_ACCOUNT_ID: accountId } });
if (!new RegExp(`\\b${PROJECT}\\b`).test(list.stdout ?? '')) run('npx', [...WRANGLER, 'pages', 'project', 'create', PROJECT, '--production-branch', 'main'], { env: { CLOUDFLARE_ACCOUNT_ID: accountId } });

// pages.dev names are global: if "${PROJECT}" was taken, Cloudflare adds a suffix. Use the real one.
const listed = run('npx', [...WRANGLER, 'pages', 'project', 'list'], { capture: true, allowFail: true, env: { CLOUDFLARE_ACCOUNT_ID: accountId } }).stdout ?? '';
const domain = (listed.match(new RegExp(`${PROJECT}[a-z0-9-]*\\.pages\\.dev`)) ?? [])[0];
const siteUrl = domain ? `https://${domain}` : SITE;
if (siteUrl !== 'https://sightline-data.pages.dev') {
  console.log(`\n! Your site address is ${siteUrl}. Set it in src/data/dataHost.ts (DATA_HOST) and commit, so the app uses it.`);
}

step('Deploying data-site/dist');
run('npx', [...WRANGLER, 'pages', 'deploy', 'data-site/dist', '--project-name', PROJECT, '--branch', 'main', '--commit-dirty=true'], { env: { CLOUDFLARE_ACCOUNT_ID: accountId } });

step(`Verifying ${siteUrl}`);
await new Promise((r) => setTimeout(r, 15000));
run('npx', ['tsx', 'tools/data-site/verify-site.ts', '--remote', siteUrl]);

step('Daily auto-update: GitHub secrets');
console.log('Create a token that can only edit Cloudflare Pages. This link pre-fills it:');
console.log(`  ${TOKEN_URL}`);
console.log('Click "Continue to summary" → "Create Token", copy it, and paste it here (input is hidden).');
const token = await ask('Cloudflare API token: ', true);
if (!/^[A-Za-z0-9_-]{30,}$/.test(token)) {
  console.error('✗ That does not look like a Cloudflare API token. Nothing was stored. Re-run to try again.');
  process.exit(1);
}
run('gh', ['secret', 'set', 'CLOUDFLARE_API_TOKEN', '--repo', repo], { input: token, capture: true });
run('gh', ['secret', 'set', 'CLOUDFLARE_ACCOUNT_ID', '--repo', repo], { input: accountId, capture: true });
if (PROJECT !== 'sightline-data') run('gh', ['variable', 'set', 'CF_PAGES_PROJECT', '--repo', repo, '--body', PROJECT], { capture: true });
if (siteUrl !== 'https://sightline-data.pages.dev') run('gh', ['variable', 'set', 'DATA_SITE_URL', '--repo', repo, '--body', siteUrl], { capture: true });
console.log('secrets stored (values not shown)');

step('Starting the first scheduled build now');
run('gh', ['workflow', 'run', 'data-site.yml', '--repo', repo], { allowFail: true });
console.log(`\nDone. Site: ${siteUrl}. It rebuilds every day at 07:23 UTC; watch runs with: gh run list --workflow data-site.yml`);
