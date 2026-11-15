import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LearnView } from "./components/LearnView";
import { LayersControl } from "./components/LayersControl";
import { LongViewCard } from "./components/LongViewCard";
import { ReservesSection } from "./components/ReservesSection";
import type { Basemap } from "./components/MapView";
// The map library is ~800 kB: load it in parallel so the story text appears first.
const MapView = lazy(() => import("./components/MapView").then((m) => ({ default: m.MapView })));
import { SpotHistory } from "./components/SpotHistory";
import { StoryPanel } from "./components/StoryPanel";
import { Timeline } from "./components/Timeline";
import { TopBar } from "./components/TopBar";
import { STORIES } from "./content/stories";
import { formatValue, shortDate } from "./lib/format";
import { makeShareCard, shareOrDownload } from "./lib/shareCard";
import { playSeries } from "./lib/sonify";
import { usePixels } from "./lib/usePixels";
import { useStoryData } from "./lib/useStoryData";
import { useTheme } from "./lib/useTheme";
import type { StoryId, View } from "./types";

/** The forest reserve containing a point, if any (ray casting on the outer ring). */
function reserveAt(rs: import("./types").Reserves | null, lon: number, lat: number) {
  for (const f of rs?.features ?? []) {
    const ring = f.geometry.coordinates[0];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) return f.properties;
  }
  return null;
}

const initialView = (): View => {
  const h = window.location.hash.replace("#", "");
  return h === "floods" || h === "learn" || h === "galamsey" ? h : "galamsey";
};

export default function App() {
  const [view, setView] = useState<View>(initialView);
  const [theme, toggleTheme] = useTheme();
  const [storyId, setStoryId] = useState<StoryId>(view === "floods" ? "floods" : "galamsey");
  const story = STORIES[storyId];
  const { data, exposure, longview, reserves, rivers, loading } = useStoryData(story);
  const [showRivers, setShowRivers] = useState(true);
  const [showReserves, setShowReserves] = useState(false);
  const [longYear, setLongYear] = useState<number | null>(null);
  const [spot, setSpot] = useState<{ lon: number; lat: number } | null>(null);
  const pixels = usePixels(story.id, spot !== null);
  const onSpot = useCallback((lon: number, lat: number) => setSpot({ lon, lat }), []);

  const dates = useMemo(
    () => (data.frames.length ? data.frames.map((f) => f.date) : story.dates),
    [data, story],
  );
  const [index, setIndex] = useState(dates.length - 1);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [basemap, setBasemap] = useState<Basemap>("dark");
  const [showBase, setShowBase] = useState(true);
  const [showChange, setShowChange] = useState(true);
  const [showFootprint, setShowFootprint] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
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
    setSpot(null);
    setLongYear(null);
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

  // Sentinel-1 year from the panel. On phones the panel sits below the map, so bring the map into view.
  const pickYear = (y: number | null) => {
    setLongYear(y);
    setCompareIndex(null);
    if (y !== null && window.matchMedia("(max-width: 860px)").matches) {
      document.querySelector(".stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // W4: a shareable image of the current view (map snapshot + headline number + date + link).
  const share = async () => {
    const pt = data.series.points.find((p) => p.date === date) ?? data.series.points[data.series.points.length - 1];
    const map = document.querySelector<HTMLCanvasElement>(".map:not(.map-compare) canvas.maplibregl-canvas");
    // Crop to what the viewer actually sees: right of the floating panel, above the time bar.
    let crop: { x: number; y: number; w: number; h: number } | undefined;
    if (map) {
      const box = map.getBoundingClientRect();
      const k = map.width / box.width;
      const panel = document.querySelector(".panel")?.getBoundingClientRect();
      const bar = document.querySelector(".timeline")?.getBoundingClientRect();
      const left = panel && panel.right < box.right && getComputedStyle(document.querySelector(".panel")!).position === "absolute"
        ? panel.right - box.left : 0;
      const bottom = bar ? bar.top - box.top : box.height;
      crop = { x: left * k, y: 0, w: (box.width - left) * k, h: bottom * k };
    }
    const blob = await makeShareCard({
      map,
      crop,
      kicker: story.kicker,
      title: story.title,
      value: pt ? formatValue(pt.value, data.series.unit) : "",
      label: data.series.label,
      date: `${shortDate(pt?.date ?? date)} 2026`,
      color: story.changeColor,
      url: `asaase.earth/#${story.id}`,
    });
    await shareOrDownload(blob, `asaase-${story.id}-${date}.png`, `${story.title}: NISAR radar view of Ghana. https://asaase.earth/#${story.id}`);
  };

  const pickDate = (d: string) => {
    const i = dates.indexOf(d);
    if (i >= 0) setIndex(i);
  };

  // The date list can shrink (placeholder dates → real passes) before the reset effect runs,
  // so clamp both indexes for this render.
  const at = Math.min(index, dates.length - 1);
  const cmpAt = compareIndex !== null && compareIndex < dates.length ? compareIndex : null;
  const date = dates[at];
  const frame = data.frames.find((f) => f.date === date);
  const compareDate = cmpAt !== null ? dates[cmpAt] : null;
  const compareFrame = compareDate ? data.frames.find((f) => f.date === compareDate) : undefined;
  const people = exposure?.frames[date];
  const longImage = longYear !== null ? longview?.years.find((y) => y.year === longYear)?.image ?? null : null;

  return (
    <div className="app">
      <TopBar view={view} onView={go} theme={theme} onTheme={toggleTheme} />
      {view === "learn" ? (
        <LearnView onStory={go} />
      ) : (
        <main className={`workspace ${panelOpen ? "" : "panel-hidden"}`}>
          <StoryPanel
            story={story}
            data={data}
            frame={frame}
            people={people}
            currentDate={date}
            onPickDate={pickDate}
            listening={listening}
            onListen={toggleListen}
            extra={<>
              {longview && <LongViewCard data={longview} year={longYear} onYear={pickYear} />}
              {reserves && <ReservesSection data={reserves} onShow={() => setShowReserves(true)} />}
            </>}
            onCollapse={() => setPanelOpen(false)}
            onShare={data.frames.length ? share : undefined}
          />
          {!panelOpen && (
            <button className="panel-open fab" onClick={() => setPanelOpen(true)} aria-label="Show the story panel">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {story.title}
            </button>
          )}
          <section className="stage" aria-label="Radar map">
            <Suspense fallback={<div className="map-wrap" aria-hidden="true" />}>
            <MapView
              bounds={data.bounds}
              storyKey={story.id}
              focus={story.focus}
              outlines={story.outlines}
              reserves={reserves}
              showReserves={showReserves}
              rivers={rivers}
              showRivers={showRivers}
              places={story.places}
              communities={showChange ? people?.communities ?? [] : []}
              spot={spot}
              longview={longImage}
              onSpot={data.frames.length ? onSpot : undefined}
              frame={frame}
              compareFrame={compareFrame}
              date={date}
              compareDate={compareDate}
              basemap={basemap}
              theme={theme}
              showBase={showBase}
              showFootprint={showFootprint}
              showChange={showChange}
              hasData={loading || data.frames.length > 0}
              siteName={story.title}
            />
            </Suspense>
            <LayersControl
              basemap={basemap}
              onBasemap={setBasemap}
              layers={[
                { id: "base", label: `Radar (${story.basePolLabel})`, swatch: "linear-gradient(90deg,#1b201f,#d9dedc)", on: showBase, onChange: setShowBase,
                  hint: "The radar image itself: bright = strong echo" },
                ...(story.footprint
                  ? [{ id: "footprint", label: story.footprint.label, swatch: story.footprint.color, on: showFootprint, onChange: setShowFootprint }]
                  : []),
                { id: "change", label: story.changeLabel, swatch: story.changeSwatch ?? story.changeColor, on: showChange, onChange: setShowChange },
                ...(rivers
                  ? [{ id: "rivers", label: "Rivers", swatch: "#5cb8ff", on: showRivers, onChange: setShowRivers, hint: "River names and courses from OpenStreetMap" }]
                  : []),
                ...(reserves
                  ? [{ id: "reserves", label: "Forest reserves", swatch: "repeating-linear-gradient(90deg,#4cd08a 0 4px,transparent 4px 7px)",
                       on: showReserves, onChange: setShowReserves, hint: "Reserve boundaries from OpenStreetMap" }]
                  : []),
              ]}
            />
            {longYear !== null && longImage && (
              <div className="lv-banner" role="status">
                <span>Sentinel-1 · {longYear} dry season</span>
                <button onClick={() => setLongYear(null)}>Back to NISAR 2026</button>
              </div>
            )}
            {spot && !pixels && (
              <div className="spot" role="status"><p className="note" style={{ margin: 0 }}>Loading this spot's history…</p></div>
            )}
            {spot && pixels && (
              <SpotHistory
                story={story.id}
                grid={pixels}
                lon={spot.lon}
                lat={spot.lat}
                currentDate={date}
                frames={data.frames}
                scarThresholdDb={typeof data.method?.damageThresholdDb === "number" ? data.method.damageThresholdDb : undefined}
                color={story.id === "floods" ? "#8fb4ff" : "#d99a3e"}
                onPick={pickDate}
                reserve={reserveAt(reserves, spot.lon, spot.lat)}
                onClose={() => setSpot(null)}
              />
            )}
            <Timeline
              dates={dates}
              index={at}
              onIndex={(i) => { setPlaying(false); setIndex(i); setLongYear(null); }}
              events={story.events}
              playing={playing}
              onTogglePlay={togglePlay}
              compareIndex={cmpAt}
              onCompare={(on) => { setLongYear(null); setCompareIndex(on ? Math.max(0, at - 1) : null); }}
              onCompareIndex={setCompareIndex}
            />
          </section>
        </main>
      )}
    </div>
  );
}
