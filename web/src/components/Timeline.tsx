import { useEffect } from "react";
import { DOMAIN, GAPS } from "../content/stories";
import { monthTicks, shortDate, toTime } from "../lib/format";
import type { TimelineEvent } from "../types";

interface Props {
  dates: string[];
  index: number;
  onIndex: (i: number) => void;
  events: TimelineEvent[];
  playing: boolean;
  onTogglePlay: () => void;
  compareIndex: number | null;
  onCompare: (on: boolean) => void;
  onCompareIndex: (i: number) => void;
}

/** Slim time bar: play, current pass, one tick per pass, and before/after compare. */
export function Timeline({ dates, index, onIndex, events, playing, onTogglePlay, compareIndex, onCompare, onCompareIndex }: Props) {
  const t0 = toTime(DOMAIN[0]);
  const t1 = toTime(DOMAIN[1]);
  const pct = (iso: string) => `${((toTime(iso) - t0) / (t1 - t0)) * 100}%`;
  const comparing = compareIndex !== null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, select, textarea, button")) return;
      if (e.key === "ArrowRight") onIndex(Math.min(dates.length - 1, index + 1));
      if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
      if (e.key === " ") { e.preventDefault(); onTogglePlay(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dates.length, index, onIndex, onTogglePlay]);

  return (
    <div className="timeline" role="group" aria-label="Radar passes">
      <button className="play" onClick={onTogglePlay} aria-label={playing ? "Pause" : "Play through all passes"}>
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="2" y="1" width="3.5" height="12" rx="1" fill="currentColor" /><rect x="8.5" y="1" width="3.5" height="12" rx="1" fill="currentColor" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 14 14"><path d="M3 1.5v11a.8.8 0 0 0 1.2.7l9-5.5a.8.8 0 0 0 0-1.4l-9-5.5A.8.8 0 0 0 3 1.5Z" fill="currentColor" /></svg>
        )}
      </button>

      <div className="tl-now">
        <span className="tl-date">{shortDate(dates[index])} 2026</span>
        <span className="tl-count">Pass {index + 1} / {dates.length}</span>
      </div>

      <div className="tl-body">
        <div className="tl-track">
          <div className="tl-rail" />
          {GAPS.map((g) => (
            <div key={g.from} className="tl-gap" style={{ left: pct(g.from), width: `calc(${pct(g.to)} - ${pct(g.from)})` }}
                 title={`${g.label}: ${shortDate(g.from)} – ${shortDate(g.to)}`} />
          ))}
          <div className="tl-progress" style={{ width: pct(dates[index]) }} />
          {events.map((e) => (
            <span key={e.date} className="tl-event" style={{ left: pct(e.date) }} tabIndex={0} aria-label={`${e.label}, ${shortDate(e.date)}`}>
              <span className="tl-event-label">{e.label} · {shortDate(e.date)}</span>
            </span>
          ))}
          {dates.map((d, i) => (
            <button
              key={d}
              className={`tl-tick ${i === index ? "is-current" : ""} ${i === compareIndex ? "is-compare" : ""} ${i < index ? "is-past" : ""}`}
              style={{ left: pct(d) }}
              onClick={() => onIndex(i)}
              aria-label={`Pass ${shortDate(d)}`}
              title={shortDate(d)}
            />
          ))}
        </div>
        <div className="tl-months" aria-hidden="true">
          {monthTicks(DOMAIN[0], DOMAIN[1]).map((m) => (
            <span key={m.iso} style={{ left: pct(m.iso) }}>{m.label}</span>
          ))}
        </div>
      </div>

      <div className="tl-compare">
        {comparing && (
          <label className="tl-vs">
            <span>vs</span>
            <select value={compareIndex!} onChange={(e) => onCompareIndex(Number(e.target.value))} aria-label="Compare with pass">
              {dates.map((d, i) => <option key={d} value={i}>{shortDate(d)}</option>)}
            </select>
          </label>
        )}
        <button className={`chip ${comparing ? "is-on" : ""}`} onClick={() => onCompare(!comparing)} aria-pressed={comparing}
                title="Swipe between two passes">
          <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 2v14M6 4 2 9l4 5M12 4l4 5-4 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Compare
        </button>
      </div>
    </div>
  );
}
