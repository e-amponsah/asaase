import type { StoryContent, StoryData } from "../types";
import { SeriesChart } from "./SeriesChart";

interface Props {
  story: StoryContent;
  data: StoryData;
  currentDate: string;
  onPickDate: (d: string) => void;
  listening: boolean;
  onListen: () => void;
}

export function StoryPanel({ story, data, currentDate, onPickDate, listening, onListen }: Props) {
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
