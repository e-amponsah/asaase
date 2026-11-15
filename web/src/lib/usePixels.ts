import { useEffect, useState } from "react";
import type { StoryId } from "../types";

/** Header of web/public/data/<story>/pixels.json, written by the pipeline. */
export interface PixelGrid {
  bounds: [number, number, number, number]; // west, south, east, north
  width: number;
  height: number;
  dates: string[];
  pol: string;
  scale: number;   // dB = value × scale
  nodata: number;
  file: string;
  values: Int16Array; // [date][row][col], row 0 = north
}

/** Loads the coarse per-pixel backscatter history (about 170 m cells) for click-a-spot charts.
 *  It is about 1 MB, so it is fetched only once `enabled` (the first map click), not on page load. */
export function usePixels(story: StoryId, enabled = true): PixelGrid | null {
  const [state, setState] = useState<{ id: StoryId | ""; grid: PixelGrid | null }>({ id: "", grid: null });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const base = import.meta.env.BASE_URL;
    fetch(`${base}data/${story}/pixels.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (head: Omit<PixelGrid, "values"> | null) => {
        if (!head) return null;
        const bin = await fetch(`${base}${head.file}`).then((r) => (r.ok ? r.arrayBuffer() : null));
        if (!bin || bin.byteLength !== head.width * head.height * head.dates.length * 2) return null;
        return { ...head, values: new Int16Array(bin) };
      })
      .catch(() => null)
      .then((grid) => { if (!cancelled) setState({ id: story, grid }); });
    return () => { cancelled = true; };
  }, [story, enabled]);

  return state.id === story ? state.grid : null;
}

/** dB per date at a lon/lat (null where there is no data), or null outside the grid. */
export function pixelHistory(g: PixelGrid, lon: number, lat: number): (number | null)[] | null {
  const [w, s, e, n] = g.bounds;
  if (lon < w || lon > e || lat < s || lat > n) return null;
  const col = Math.min(g.width - 1, Math.floor(((lon - w) / (e - w)) * g.width));
  const row = Math.min(g.height - 1, Math.floor(((n - lat) / (n - s)) * g.height));
  const plane = g.width * g.height;
  return g.dates.map((_, i) => {
    const v = g.values[i * plane + row * g.width + col];
    return v === g.nodata ? null : v * g.scale;
  });
}
