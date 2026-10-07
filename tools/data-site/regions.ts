/**
 * Fetch grid for the data build: 2°×2° cells over the contiguous U.S., Alaska, Hawaii and
 * Puerto Rico. Bounding-box queries are far cheaper for Overpass than state-boundary area
 * queries (which time out for large states), and each cell falls back independently.
 */
export interface FetchCell {
  code: string;
  bbox: [number, number, number, number];
}

const AREAS: { name: string; w: number; s: number; e: number; n: number; step: number }[] = [
  { name: 'contiguous', w: -125, s: 24, e: -66, n: 50, step: 2 },
  { name: 'alaska', w: -180, s: 51, e: -129, n: 72, step: 3 },
  { name: 'hawaii', w: -161, s: 18, e: -154, n: 23, step: 2 },
  { name: 'puerto-rico', w: -68, s: 17, e: -65, n: 19, step: 3 },
];

export const FETCH_CELLS: FetchCell[] = AREAS.flatMap((a) => {
  const out: FetchCell[] = [];
  for (let s = a.s; s < a.n; s += a.step)
    for (let w = a.w; w < a.e; w += a.step) {
      const bbox: [number, number, number, number] = [w, s, Math.min(w + a.step, a.e), Math.min(s + a.step, a.n)];
      out.push({ code: `c${s}_${w}`, bbox });
    }
  return out;
});
