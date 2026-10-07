/**
 * Polite client for the public Overpass API (spec §9 upstream rules): one request in flight,
 * 30 s timeout, at most 3 retries with exponential backoff + jitter, Retry-After respected,
 * response-size ceiling. Only ever called from an explicit user action.
 */

export const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';
const UA = 'Sightline/0.1 (privacy-first camera transparency notebook; https://github.com/ntoledo319/Bad_Camera)';

export interface OverpassOptions {
  fetchImpl?: typeof fetch;
  /** Overpass interpreter URL; defaults to OVERPASS_ENDPOINT. */
  endpoint?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  maxRetries?: number;
  maxBytes?: number;
  /** Injected for tests. */
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export class OverpassError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
  ) {
    super(message);
  }
}

let inFlight = false;

const RETRY_STATUS = new Set([429, 502, 503, 504]);

/** Retry-After as seconds or an HTTP date; capped so a hostile header cannot stall the app. */
export function retryAfterMs(header: string | null, now = Date.now()): number | null {
  if (!header) return null;
  const secs = Number(header);
  const ms = Number.isFinite(secs) ? secs * 1000 : Date.parse(header) - now;
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.min(ms, 60_000);
}

export function backoffMs(attempt: number, random: () => number = Math.random): number {
  return Math.min(1000 * 2 ** attempt, 16_000) + Math.floor(random() * 500);
}

export async function overpassRequest(query: string, o: OverpassOptions = {}): Promise<string> {
  const { fetchImpl = fetch, endpoint = OVERPASS_ENDPOINT, signal, timeoutMs = 30_000, maxRetries = 3, maxBytes = 20_000_000, random = Math.random } = o;
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  if (inFlight) throw new OverpassError('Another camera-data request is already running. Wait for it to finish.', false);
  inFlight = true;
  try {
    let lastErr: OverpassError | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (signal?.aborted) throw new OverpassError('Request canceled', false);
      const ctl = new AbortController();
      const onAbort = () => ctl.abort();
      signal?.addEventListener('abort', onAbort);
      const timer = setTimeout(() => ctl.abort(), timeoutMs);
      let wait: number | null = null;
      try {
        const res = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
          body: 'data=' + encodeURIComponent(query),
          signal: ctl.signal,
        });
        if (RETRY_STATUS.has(res.status)) {
          lastErr = new OverpassError(res.status === 429 ? 'The data provider is busy (rate limited)' : `The data provider is unavailable (HTTP ${res.status})`, true);
          wait = retryAfterMs(res.headers.get('Retry-After'));
        } else if (!res.ok) {
          throw new OverpassError(`The data provider answered HTTP ${res.status}`, false);
        } else {
          const declared = Number(res.headers.get('Content-Length'));
          if (Number.isFinite(declared) && declared > maxBytes) throw new OverpassError('The response is larger than Sightline accepts for one area. Zoom in and try a smaller area.', false);
          const text = await res.text();
          if (text.length > maxBytes) throw new OverpassError('The response is larger than Sightline accepts for one area. Zoom in and try a smaller area.', false);
          return text;
        }
      } catch (e) {
        if (e instanceof OverpassError && !e.retryable) throw e;
        if (signal?.aborted) throw new OverpassError('Request canceled', false);
        lastErr = e instanceof OverpassError ? e : new OverpassError(ctl.signal.aborted ? `No answer within ${Math.round(timeoutMs / 1000)} seconds` : `Network error: ${(e as Error).message}`, true);
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      }
      if (attempt < maxRetries) await sleep(wait ?? backoffMs(attempt, random));
    }
    throw new OverpassError(`${lastErr?.message ?? 'Request failed'} after ${maxRetries + 1} attempts. Your existing data is unchanged.`, false);
  } finally {
    inFlight = false;
  }
}
