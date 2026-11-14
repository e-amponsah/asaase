import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LearnView } from "./components/LearnView";
import { MapControls } from "./components/MapControls";
import { MapView, type Basemap } from "./components/MapView";
import { StoryPanel } from "./components/StoryPanel";
import { Timeline } from "./components/Timeline";
import { TopBar } from "./components/TopBar";
import { STORIES } from "./content/stories";
import { shortDate } from "./lib/format";
import { playSeries } from "./lib/sonify";
import { useStoryData } from "./lib/useStoryData";
import type { StoryId, View } from "./types";

const initialView = (): View => {
  const h = window.location.hash.replace("#", "");
  return h === "floods" || h === "learn" || h === "galamsey" ? h : "galamsey";
};

export default function App() {
  const [view, setView] = useState<View>(initialView);
  const [storyId, setStoryId] = useState<StoryId>(view === "floods" ? "floods" : "galamsey");
  const story = STORIES[storyId];
  const { data } = useStoryData(story);

  const dates = useMemo(
    () => (data.frames.length ? data.frames.map((f) => f.date) : story.dates),
    [data, story],
  );
  const [index, setIndex] = useState(dates.length - 1);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("dark");
  const [showBase, setShowBase] = useState(true);
  const [showChange, setShowChange] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [listening, setListening] = useState(false);
  const stopAudio = useRef<(() => void) | null>(null);

  const show = useCallback((v: View) => {
    setView(v);
    if (v !== "learn") setStoryId(v);
  }, []);

  const go = useCallback((v: View) => {
    show(v);
    if (window.location.hash !== `#${v}`) window.history.pushState(null, "", `#${v}`);
  }, [show]);

  // Shareable links and the back button: #galamsey, #floods, #learn
  useEffect(() => {
    const onHash = () => show(initialView());
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, [show]);

  // New story or new data: jump to the latest pass, leave compare mode, stop playback.
  useEffect(() => {
    setIndex(dates.length - 1);
    setCompareIndex(null);
    setPlaying(false);
    stopAudio.current?.();
  }, [storyId, dates.length]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setIndex((i) => {
        if (i >= dates.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1100);
    return () => clearInterval(id);
  }, [playing, dates.length]);

  useEffect(() => () => stopAudio.current?.(), []);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && index >= dates.length - 1) setIndex(0);
      return !p;
    });
  }, [index, dates.length]);

  const toggleListen = () => {
    if (listening) {
      stopAudio.current?.();
      stopAudio.current = null;
      setListening(false);
      return;
    }
    setPlaying(false);
    setListening(true);
    const pts = data.series.points;
    stopAudio.current = playSeries(pts.map((p) => p.value), {
      onStep: (i) => {
        const at = dates.indexOf(pts[i].date);
        if (at >= 0) setIndex(at);
      },
      onEnd: () => {
        stopAudio.current = null;
        setListening(false);
      },
    });
  };

  const pickDate = (d: string) => {
    const i = dates.indexOf(d);
    if (i >= 0) setIndex(i);
  };

  const date = dates[Math.min(index, dates.length - 1)];
  const frame = data.frames.find((f) => f.date === date);
  const compareDate = compareIndex !== null ? dates[compareIndex] : null;
  const compareFrame = compareDate ? data.frames.find((f) => f.date === compareDate) : undefined;

  return (
    <div className="app">
      <TopBar view={view} onView={go} />
      {view === "learn" ? (
        <LearnView onStory={go} />
      ) : (
        <main className="workspace">
          <StoryPanel
            story={story}
            data={data}
            currentDate={date}
            onPickDate={pickDate}
            listening={listening}
            onListen={toggleListen}
          />
          <section className="stage" aria-label="Radar map">
            <MapView
              bounds={data.bounds}
              storyKey={story.id}
              places={story.places}
              frame={frame}
              compareFrame={compareFrame}
              date={date}
              compareDate={compareDate}
              basemap={basemap}
              showBase={showBase}
              showChange={showChange}
              hasData={data.frames.length > 0}
            />
            <MapControls
              comparing={compareIndex !== null}
              onCompare={(on) => setCompareIndex(on ? 0 : null)}
              compareOptions={dates}
              compareDate={compareDate}
              onCompareDate={(d) => setCompareIndex(dates.indexOf(d))}
              basemap={basemap}
              onBasemap={setBasemap}
              showBase={showBase}
              onShowBase={setShowBase}
              showChange={showChange}
              onShowChange={setShowChange}
              baseLabel={story.basePolLabel}
              changeLabel={story.changeLabel}
              changeColor={story.changeColor}
              formatDate={shortDate}
            />
            <Timeline
              dates={dates}
              index={index}
              onIndex={(i) => { setPlaying(false); setIndex(i); }}
              events={story.events}
              playing={playing}
              onTogglePlay={togglePlay}
              compareIndex={compareIndex}
            />
          </section>
        </main>
      )}
    </div>
  );
}
