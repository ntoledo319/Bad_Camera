/**
 * Client for the published Sightline data site (static files on Cloudflare Pages).
 * Same politeness rules as the Overpass client: timeout, bounded retries with backoff,
 * Retry-After, size ceiling. Every tile is checked against the SHA-256 in the manifest.
 */
import { sha256Hex } from '../domain/hash';
import { SiteManifest, TileFile, type TileEntry } from '../domain/tiles';
import { backoffMs, retryAfterMs } from './overpass';

/** Published site. EXPO_PUBLIC_DATA_HOST (inlined at build time) overrides it for testing or a renamed project. */
export const DATA_HOST = (process.env.EXPO_PUBLIC_DATA_HOST || 'https://sightline-data.pages.dev').replace(/\/$/, '');

export interface HostOptions {
  fetchImpl?: typeof fetch;
  host?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
}

async function getText(url: string, o: HostOptions, maxBytes: number): Promise<string> {
  const { fetchImpl = fetch, signal, timeoutMs = 30_000, maxRetries = 2 } = o;
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last = 'Request failed';
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (signal?.aborted) throw new Error('Request canceled');
    const ctl = new AbortController();
    const onAbort = () => ctl.abort();
    signal?.addEventListener('abort', onAbort);
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    let wait: number | null = null;
    try {
      const res = await fetchImpl(url, { signal: ctl.signal });
      if (res.status === 429 || res.status >= 500) {
        last = `The data site answered HTTP ${res.status}`;
        wait = retryAfterMs(res.headers.get('Retry-After'));
      } else if (!res.ok) {
        throw Object.assign(new Error(`The data site answered HTTP ${res.status}`), { final: true });
      } else {
        const text = await res.text();
        if (text.length > maxBytes) throw Object.assign(new Error('The data site sent more data than expected'), { final: true });
        return text;
      }
    } catch (e) {
      if ((e as { final?: boolean }).final) throw e;
      if (signal?.aborted) throw new Error('Request canceled');
      last = ctl.signal.aborted ? `The data site did not answer within ${Math.round(timeoutMs / 1000)} seconds` : `Network error: ${(e as Error).message}`;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
    if (attempt < maxRetries) await sleep(wait ?? backoffMs(attempt));
  }
  throw new Error(last);
}

export async function fetchSiteManifest(o: HostOptions = {}): Promise<SiteManifest> {
  const host = o.host ?? DATA_HOST;
  const text = await getText(`${host}/v1/manifest.json`, o, 5_000_000);
  try {
    return SiteManifest.parse(JSON.parse(text));
  } catch {
    throw new Error('The data site index is not in a format this version of Sightline understands');
  }
}

export async function fetchTile(entry: TileEntry, o: HostOptions = {}): Promise<{ tile: TileFile; bytes: number }> {
  const host = o.host ?? DATA_HOST;
  const text = await getText(`${host}/v1/${entry.path}`, o, 20_000_000);
  if (sha256Hex(text) !== entry.sha256) throw new Error(`Tile ${entry.id} did not match its published checksum; nothing was saved`);
  const tile = TileFile.parse(JSON.parse(text));
  if (tile.id !== entry.id) throw new Error(`Tile ${entry.id} has the wrong identity; nothing was saved`);
  return { tile, bytes: text.length };
}
