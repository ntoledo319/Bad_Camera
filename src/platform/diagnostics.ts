/**
 * In-memory diagnostics ring buffer. Messages are scrubbed: coordinates, long hex
 * digests, file URIs and anything that looks like a note are removed before storage.
 * Nothing leaves the device unless the user exports it from Settings → Diagnostics.
 */
export interface DiagEntry {
  at: string;
  level: 'info' | 'warn' | 'error';
  area: string;
  message: string;
}
const MAX = 200;
const buf: DiagEntry[] = [];

export function scrub(s: string): string {
  return s
    .replace(/-?\d{1,3}\.\d{3,}/g, '[num]')
    .replace(/\b[0-9a-f]{16,}\b/gi, '[hex]')
    .replace(/(file|content|blob|data):[^\s"')]+/gi, '[uri]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .slice(0, 300);
}

export function log(level: DiagEntry['level'], area: string, message: string) {
  buf.push({ at: new Date().toISOString(), level, area: scrub(area), message: scrub(message) });
  if (buf.length > MAX) buf.shift();
}

export function entries(): DiagEntry[] {
  return [...buf];
}
export function clearDiagnostics() {
  buf.length = 0;
}
