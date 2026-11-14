import { useEffect, useState } from "react";
import type { StoryContent, StoryData } from "../types";

/**
 * Loads pipeline output (public/data/<story>/story.json). Until the pipeline has run,
 * falls back to the story's illustrative series, with no radar frames and illustrative: true.
 */
export function useStoryData(story: StoryContent): { data: StoryData; loading: boolean } {
  const [state, setState] = useState<{ id: string; data: StoryData | null }>({ id: "", data: null });

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/${story.id}/story.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((json: StoryData | null) => {
        if (!cancelled) setState({ id: story.id, data: json?.frames?.length ? json : null });
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

  return { data: state.id === story.id && state.data ? state.data : fallback, loading: state.id !== story.id };
}
