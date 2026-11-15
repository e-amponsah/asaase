import type { ReactNode } from "react";
import { formatValue } from "../lib/format";
import type { ExposureFrame, Frame, StoryContent, StoryData } from "../types";
import { SeriesChart } from "./SeriesChart";

/** Per-pass numbers from the pipeline worth showing under the chart. */
const BREAKDOWN: Record<string, { label: string; unit: string; color: string }> = {
  openWaterKm2: { label: "New open water", unit: "km²", color: "#38aaff" },
  floodedVegetationKm2: { label: "Flooded vegetation", unit: "km²", color: "#b48cff" },
  newDisturbanceHa: { label: "New since first pass", unit: "ha", color: "#f05a3c" },
};

interface Props {
  story: StoryContent;
  data: StoryData;
  frame?: Frame;
  people?: ExposureFrame;
  currentDate: string;
  onPickDate: (d: string) => void;
  listening: boolean;
  onListen: () => void;
  extra?: ReactNode;       // story-specific sections (e.g. the Sentinel-1 long view)
  onCollapse?: () => void; // hide the panel to give the map the whole screen
  onShare?: () => void;    // make a shareable image of this view
}

/** The story panel: headline number and chart first; context and details fold away below. */
export function StoryPanel({ story, data, frame, people, currentDate, onPickDate, listening, onListen, extra, onCollapse, onShare }: Props) {
  const breakdown = Object.entries(frame?.stats ?? {}).filter(([k]) => k in BREAKDOWN);
  const notes = [
    frame?.baseline ? "This pass is part of the dry, pre-spill baseline." : null,
    frame?.note ?? null,
    frame?.coverage !== undefined && frame.coverage < 0.9 ? `Radar covered ${Math.round(frame.coverage * 100)}% of the area on this pass.` : null,
  ].filter(Boolean) as string[];

  return (
    <aside className="panel" aria-label={story.title}>
      <div className="panel-scroll">
        <header className="panel-head">
          <div>
            <p className="eyebrow">{story.kicker}</p>
            <h1 className="title">{story.title}</h1>
          </div>
          {onCollapse && (
            <button className="icon-btn panel-collapse" onClick={onCollapse} aria-label="Hide panel" title="Hide panel">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
        </header>
        <p className="lede">{story.lede}</p>

        <section className="metric" aria-label={data.series.label}>
          <div className="metric-head">
            <h2>{data.series.label}</h2>
            <span className="source-tag" title={`NISAR track ${data.track}`}>
              {data.illustrative ? "Illustrative" : "NISAR L-band"}
            </span>
          </div>
          <SeriesChart series={data.series} currentDate={currentDate} events={story.events} color={story.changeColor} onPick={onPickDate} />

          {(breakdown.length > 0 || people) && (
            <dl className="rows">
              {breakdown.map(([k, v]) => (
                <div key={k} className="row">
                  <dt><span className="dot" style={{ background: BREAKDOWN[k].color }} />{BREAKDOWN[k].label}</dt>
                  <dd>{formatValue(v, BREAKDOWN[k].unit)}</dd>
                </div>
              ))}
              {people && (
                <div className="row">
                  <dt><span className="dot dot-people" />People within 1 km</dt>
                  <dd>{people.peopleWithin1km < 50 ? "almost none" : `≈ ${people.peopleWithin1km.toLocaleString("en-GB")}`}</dd>
                </div>
              )}
            </dl>
          )}
          {people && people.communities.length > 0 && (
            <p className="near">
              Nearest settlements: {people.communities.slice(0, 3).map((c) =>
                `${c.name} (${c.distanceM < 50 ? "in the water" : `${(c.distanceM / 1000).toFixed(1)} km`})`).join(", ")}
            </p>
          )}
          {notes.map((n) => <p key={n} className="note">{n}</p>)}

          <div className="actions">
            <button className={`chip ${listening ? "is-on" : ""}`} onClick={onListen} aria-pressed={listening}>
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                {listening
                  ? <rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" />
                  : <path d="M2 6h2.5L8 3v10L4.5 10H2zM10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6 6 0 0 1 0 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
              </svg>
              {listening ? "Stop" : "Listen to the record"}
            </button>
            {onShare && (
              <button className="chip" onClick={onShare}>
                <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 10V2M5 5l3-3 3 3M3 8v5h10V8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Share this view
              </button>
            )}
            <span className="hint">Tip: click the map for any spot's history</span>
          </div>
        </section>

        {extra}

        <details className="section">
          <summary>Reading the radar</summary>
          <ul className="legend">
            {story.readingTheRadar.map((r) => (
              <li key={r.label}>
                <span className="legend-swatch" style={{ background: r.swatch }} />
                <span><strong>{r.label}.</strong> {r.text}</span>
              </li>
            ))}
          </ul>
        </details>

        <details className="section">
          <summary>Context and sources</summary>
          <dl className="facts-list">
            {story.stats.map((s) => (
              <div key={s.label}>
                <dt>{s.value}</dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>
          <ul className="sources">
            {story.sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
            ))}
          </ul>
          <p className="meta">NISAR L2 GCOV, NASA-ISRO · track {story.track} · via NASA ASF DAAC</p>
        </details>
      </div>
    </aside>
  );
}
