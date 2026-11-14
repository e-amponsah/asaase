import { useEffect, useState } from "react";
import type { Exposure, LongView, StoryContent, StoryData } from "../types";

/**
 * Loads pipeline output (public/data/<story>/story.json). Until the pipeline has run,
 * falls back to the story's illustrative series, with no radar frames and illustrative: true.
 */
interface Loaded {
  data: StoryData;
  exposure: Exposure | null;
  longview: LongView | null;
  loading: boolean;
}

export function useStoryData(story: StoryContent): Loaded {
  const [state, setState] = useState<{ id: string; data: StoryData | null; exposure: Exposure | null; longview: LongView | null }>(
    { id: "", data: null, exposure: null, longview: null },
  );

  useEffect(() => {
    let cancelled = false;
    const get = <T,>(file: string): Promise<T | null> =>
      fetch(`${import.meta.env.BASE_URL}data/${story.id}/${file}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    // exposure.json (floods) and longview/longview.json (galamsey) are optional.
    Promise.all([get<StoryData>("story.json"), get<Exposure>("exposure.json"), get<LongView>("longview/longview.json")])
      .then(([json, exposure, longview]) => {
        if (!cancelled) setState({ id: story.id, data: json?.frames?.length ? json : null, exposure, longview });
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
    longview: current ? state.longview : null,
    loading: !current,
  };
}
