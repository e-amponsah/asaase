import { useEffect, useRef, useState } from "react";
import { DOMAIN, GAPS } from "../content/stories";
import { formatValue, shortDate, toTime } from "../lib/format";
import type { Series, TimelineEvent } from "../types";

interface Props {
  series: Series;
  currentDate: string;
  events: TimelineEvent[];
  color: string;
  onPick: (date: string) => void;
}

const H = 168;
const PAD = { l: 8, r: 8, t: 16, b: 22 };

export function SeriesChart({ series, currentDate, events, color, onPick }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(340);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(220, e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const pts = series.points;
  if (!pts.length) return null;
  const t0 = toTime(DOMAIN[0]);
  const t1 = toTime(DOMAIN[1]);
  const max = Math.max(...pts.map((p) => p.value)) * 1.12 || 1;
  const x = (iso: string) => PAD.l + ((toTime(iso) - t0) / (t1 - t0)) * (w - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);

  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${line}L${x(pts[pts.length - 1].date)},${H - PAD.b}L${x(pts[0].date)},${H - PAD.b}Z`;
  const cur = pts.findIndex((p) => p.date === currentDate);
  const shown = hover ?? (cur >= 0 ? cur : pts.length - 1);
  const gradId = `fill-${series.label.replace(/\W/g, "")}`;

  return (
    <div className="chart" ref={wrap}>
      <div className="chart-readout">
        <span className="chart-value" style={{ color }}>{formatValue(pts[shown].value, series.unit)}</span>
        <span className="chart-date">{shortDate(pts[shown].date)}</span>
      </div>
      <svg
        width={w}
        height={H}
        role="img"
        aria-label={`${series.label} over time`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {GAPS.map((g) => (
          <rect key={g.from} x={x(g.from)} y={PAD.t} width={x(g.to) - x(g.from)} height={H - PAD.t - PAD.b} className="chart-gap" />
        ))}
        {[0.5, 1].map((f) => (
          <line key={f} x1={PAD.l} x2={w - PAD.r} y1={y(max * f / 1.12)} y2={y(max * f / 1.12)} className="chart-grid" />
        ))}
        {events.map((e) => (
          <g key={e.date}>
            <line x1={x(e.date)} x2={x(e.date)} y1={PAD.t - 6} y2={H - PAD.b} className="chart-event" />
          </g>
        ))}

        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {pts.map((p, i) => (
          <g key={p.date}>
            <circle cx={x(p.date)} cy={y(p.value)} r={i === shown ? 5 : 2.5} fill={i === shown ? color : "var(--surface)"} stroke={color} strokeWidth="1.5" />
            <rect
              x={x(p.date) - 12}
              y={0}
              width={24}
              height={H}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHover(i)}
              onClick={() => onPick(p.date)}
            />
          </g>
        ))}
        <line x1={PAD.l} x2={w - PAD.r} y1={H - PAD.b} y2={H - PAD.b} className="chart-axis" />
        {["2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"].map((m) => (
          <text key={m} x={x(m)} y={H - 6} className="chart-label" textAnchor="middle">
            {shortDate(m).split(" ")[1]}
          </text>
        ))}
      </svg>
    </div>
  );
}
