import { useEffect, useState } from "react";
import type { Exposure, StoryContent, StoryData } from "../types";

/**
 * Loads pipeline output (public/data/<story>/story.json). Until the pipeline has run,
 * falls back to the story's illustrative series, with no radar frames and illustrative: true.
 */
export function useStoryData(story: StoryContent): { data: StoryData; exposure: Exposure | null; loading: boolean } {
  const [state, setState] = useState<{ id: string; data: StoryData | null; exposure: Exposure | null }>(
    { id: "", data: null, exposure: null },
  );

  useEffect(() => {
    let cancelled = false;
    const get = <T,>(file: string): Promise<T | null> =>
      fetch(`${import.meta.env.BASE_URL}data/${story.id}/${file}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    // exposure.json is optional (floods only).
    Promise.all([get<StoryData>("story.json"), get<Exposure>("exposure.json")]).then(([json, exposure]) => {
      if (!cancelled) setState({ id: story.id, data: json?.frames?.length ? json : null, exposure });
    });
    return () => {
      cancelled = true;
    };
  }, [story.id]);

  const fallback: StoryData = {
    story: story.id,
    generated: "",
    illustrative: true,
    track: story.track,
    bounds: story.bounds,
    basePolarization: story.basePolLabel.slice(0, 2),
    frames: [],
    series: story.illustrativeSeries,
  };

  const current = state.id === story.id;
  return {
    data: current && state.data ? state.data : fallback,
    exposure: current ? state.exposure : null,
    loading: !current,
  };
}
