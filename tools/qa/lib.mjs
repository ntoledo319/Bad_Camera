// Shared helpers for browser QA scripts: build the static web export, serve folders over HTTP,
// launch Chrome. Uses the system Chrome (channel "chrome") or PLAYWRIGHT_CHROMIUM_PATH.
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync, mkdirSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';

export const ROOT = resolve(import.meta.dirname, '..', '..');
export const QA_TMP = process.env.QA_TMP ?? join(tmpdir(), 'sightline-qa');
mkdirSync(QA_TMP, { recursive: true });

/** Builds `expo export -p web` into outDir (skipped when SKIP_EXPORT=1 and it exists). */
export function buildExport(outDir, env = {}) {
  if (process.env.SKIP_EXPORT === '1' && existsSync(join(outDir, 'index.html'))) return outDir;
  const r = spawnSync('npx', ['expo', 'export', '-p', 'web', '--output-dir', outDir, '--clear'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: '1', ...env } });
  if (r.status !== 0 || !existsSync(join(outDir, 'index.html'))) throw new Error(`expo export failed:\n${(r.stderr || r.stdout).slice(-1500)}`);
  return outDir;
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.txt': 'text/plain' };

/** Static server. spa: unknown paths serve index.html. cors: adds Access-Control-Allow-Origin. */
export function serve(dir, port, { spa = false, cors = false, log = null } = {}) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    let p = normalize(join(dir, decodeURIComponent(url.pathname)));
    if (!p.startsWith(dir)) return res.writeHead(403).end();
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) {
      if (!spa) return res.writeHead(404).end('not found');
      p = join(dir, 'index.html');
    }
    log?.push(url.pathname);
    const headers = { 'Content-Type': TYPES[extname(p)] ?? 'application/octet-stream' };
    if (cors) headers['Access-Control-Allow-Origin'] = '*';
    res.writeHead(200, headers).end(readFileSync(p));
  });
  return new Promise((ok) => server.listen(port, '127.0.0.1', () => ok(server)));
}

export async function launch() {
  const exe = process.env.PLAYWRIGHT_CHROMIUM_PATH;
  return exe ? chromium.launch({ executablePath: exe }) : chromium.launch({ channel: 'chrome' });
}

/** New page that records console errors and uncaught page errors. */
export async function page(browser, { dark = false, width = 390, height = 844 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: dark ? 'dark' : 'light' });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text().slice(0, 300)}`));
  p.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 300)}`));
  return { ctx, p, errors };
}

/** Finishes onboarding (welcome → Explore) so tab routes render. */
export async function onboard(p, base) {
  await p.goto(`${base}/welcome`, { waitUntil: 'domcontentloaded' });
  await p.getByRole('button', { name: 'Explore a place' }).click({ timeout: 20000 });
  await p.waitForURL(/\/explore/, { timeout: 20000 });
  // "Explore a place" opens the place search; close it to reach the map.
  const close = p.getByRole('button', { name: 'Close', exact: true });
  if (await close.isVisible({ timeout: 3000 }).catch(() => false)) await close.click();
}
