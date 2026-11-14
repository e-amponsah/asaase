import { formatValue } from "../lib/format";
import type { Frame, StoryContent, StoryData } from "../types";
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
  currentDate: string;
  onPickDate: (d: string) => void;
  listening: boolean;
  onListen: () => void;
}

export function StoryPanel({ story, data, frame, currentDate, onPickDate, listening, onListen }: Props) {
  const breakdown = Object.entries(frame?.stats ?? {}).filter(([k]) => k in BREAKDOWN);
  return (
    <aside className="panel" aria-label={story.title}>
      <div className="panel-scroll">
        <p className="kicker">{story.kicker}</p>
        <h1 className="title">{story.title}</h1>
        <p className="lede">{story.lede}</p>

        <dl className="stats">
          {story.stats.map((s) => (
            <div key={s.label} className="stat">
              <dt>{s.value}</dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>

        <section className="card">
          <header className="card-head">
            <h2>{data.series.label}</h2>
            {data.illustrative ? (
              <span className="badge badge-warn" title="Placeholder numbers until the pipeline output is in">Illustrative</span>
            ) : (
              <span className="badge">NISAR · {data.track}</span>
            )}
          </header>
          <SeriesChart
            series={data.series}
            currentDate={currentDate}
            events={story.events}
            color={story.changeColor}
            onPick={onPickDate}
          />
          {breakdown.length > 0 && (
            <ul className="breakdown">
              {breakdown.map(([k, v]) => (
                <li key={k}>
                  <span className="legend-swatch" style={{ background: BREAKDOWN[k].color }} />
                  {BREAKDOWN[k].label}
                  <strong>{formatValue(v, BREAKDOWN[k].unit)}</strong>
                </li>
              ))}
            </ul>
          )}
          {frame?.baseline && <p className="note">This pass is part of the dry, pre-spill baseline.</p>}
          {frame?.note && <p className="note">{frame.note}</p>}
          {frame?.coverage !== undefined && frame.coverage < 0.9 && (
            <p className="note">Radar covered {Math.round(frame.coverage * 100)}% of the study area on this pass.</p>
          )}
          <button className={`listen ${listening ? "is-on" : ""}`} onClick={onListen}>
            <span className="listen-icon" aria-hidden="true">
              {listening ? (
                <svg width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 6h2.5L8 3v10L4.5 10H2zM10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6 6 0 0 1 0 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </span>
            <span>
              <strong>{listening ? "Stop" : "Listen to the land"}</strong>
              <small>The radar record played as a drum rhythm</small>
            </span>
          </button>
        </section>

        <section className="card">
          <header className="card-head">
            <h2>Reading the radar</h2>
            <span className="badge">{story.basePolLabel}</span>
          </header>
          <ul className="legend">
            {story.readingTheRadar.map((r) => (
              <li key={r.label}>
                <span className="legend-swatch" style={{ background: r.swatch }} />
                <span><strong>{r.label}.</strong> {r.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <footer className="sources">
          <h3>Sources</h3>
          <ul>
            {story.sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a></li>
            ))}
          </ul>
          <p className="meta">NISAR L-band GCOV · track {story.track}</p>
        </footer>
      </div>
    </aside>
  );
}
