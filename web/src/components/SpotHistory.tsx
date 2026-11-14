import { shortDate, toTime } from "../lib/format";
import type { PixelGrid } from "../lib/usePixels";
import { pixelHistory } from "../lib/usePixels";
import type { Frame, StoryId } from "../types";

interface Props {
  story: StoryId;
  grid: PixelGrid;
  lon: number;
  lat: number;
  currentDate: string;
  frames: Frame[];
  scarThresholdDb?: number;   // galamsey: HV below this = mining scar
  color: string;
  onPick: (date: string) => void;
  onClose: () => void;
}

const W = 268;
const H = 128;
const PAD = { l: 34, r: 10, t: 12, b: 20 };

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** A clicked spot's radar history: one point per pass, with a reference line and a plain reading. */
export function SpotHistory({ story, grid, lon, lat, currentDate, frames, scarThresholdDb, color, onPick, onClose }: Props) {
  const values = pixelHistory(grid, lon, lat);
  const pts = (values ?? [])
    .map((v, i) => ({ date: grid.dates[i], v }))
    .filter((p): p is { date: string; v: number } => p.v !== null);
  const noted = new Set(frames.filter((f) => f.note).map((f) => f.date));
  const baselineDates = new Set(frames.filter((f) => f.baseline).map((f) => f.date));

  const where = `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(3)}°${lon >= 0 ? "E" : "W"}`;

  let ref: { db: number; label: string } | null = null;
  let reading = "";
  const cur = pts.find((p) => p.date === currentDate);
  if (pts.length) {
    if (story === "galamsey" && scarThresholdDb !== undefined) {
      ref = { db: scarThresholdDb, label: "Mining-scar line" };
      const below = pts.filter((p) => !noted.has(p.date) && p.v < scarThresholdDb).length;
      const usable = pts.filter((p) => !noted.has(p.date)).length;
      reading = below === 0
        ? "Bright on every pass: forest canopy, not cleared."
        : below === usable
          ? "Below the scar line on every pass: stripped or mined ground all season."
          : `Below the scar line on ${below} of ${usable} passes: partly cleared, or ground that changes with the season.`;
    } else {
      const dry = pts.filter((p) => baselineDates.has(p.date)).map((p) => p.v);
      if (dry.length) {
        const level = 10 * Math.log10(mean(dry.map((d) => 10 ** (d / 10))));
        ref = { db: level, label: "Dry-season level here" };
        const peak = pts.filter((p) => !baselineDates.has(p.date)).reduce((a, p) => (p.v > a.v ? p : a), { date: "", v: -99 });
        const rise = peak.v - level;
        reading = rise >= 3
          ? `Up to ${rise.toFixed(1)} dB brighter than the dry season (${shortDate(peak.date)}): wetter ground or water under vegetation.`
          : rise <= -3
            ? "Darker than the dry season after the spill: possible open water."
            : "Close to its dry-season level all along: little change here.";
      }
    }
  }

  const all = pts.map((p) => p.v).concat(ref ? [ref.db] : []);
  const lo = Math.floor(Math.min(...all, -25) - 1);
  const hi = Math.ceil(Math.max(...all, -5) + 1);
  const t0 = toTime(grid.dates[0]) - 6 * 864e5;
  const t1 = toTime(grid.dates[grid.dates.length - 1]) + 6 * 864e5;
  const x = (iso: string) => PAD.l + ((toTime(iso) - t0) / (t1 - t0)) * (W - PAD.l - PAD.r);
  const y = (db: number) => PAD.t + ((hi - db) / (hi - lo)) * (H - PAD.t - PAD.b);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const ticks = [lo + 1, Math.round((lo + hi) / 2), hi - 1];

  return (
    <div className="spot" role="dialog" aria-label={`Radar history at ${where}`}>
      <header className="spot-head">
        <div>
          <strong>This spot, pass by pass</strong>
          <small>{where} · {grid.pol} backscatter · ~170 m cell</small>
        </div>
        <button className="spot-close" onClick={onClose} aria-label="Close">×</button>
      </header>
      {pts.length === 0 ? (
        <p className="note">No radar data at this spot. Click inside the study area.</p>
      ) : (
        <>
          <div className="spot-readout">
            <span style={{ color }}>{cur ? `${cur.v.toFixed(1)} dB` : "–"}</span>
            <span>{shortDate(currentDate)}</span>
          </div>
          <svg width={W} height={H} role="img" aria-label={`${grid.pol} backscatter at this spot over time`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="chart-grid" />
                <text x={PAD.l - 6} y={y(t) + 3.5} className="chart-label" textAnchor="end">{t}</text>
              </g>
            ))}
            {ref && (
              <g>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(ref.db)} y2={y(ref.db)} className="spot-ref" />
              </g>
            )}
            <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
            {pts.map((p) => {
              const on = p.date === currentDate;
              return (
                <g key={p.date} style={{ cursor: "pointer" }} onClick={() => onPick(p.date)}>
                  <circle
                    cx={x(p.date)} cy={y(p.v)} r={on ? 5 : 3}
                    fill={noted.has(p.date) ? "var(--surface)" : on ? color : "var(--surface)"}
                    stroke={color} strokeWidth="1.5" strokeDasharray={noted.has(p.date) ? "2 2" : undefined}
                  />
                  <rect x={x(p.date) - 9} y={0} width={18} height={H} fill="transparent">
                    <title>{`${shortDate(p.date)}: ${p.v.toFixed(1)} dB${noted.has(p.date) ? " (flagged pass)" : ""}`}</title>
                  </rect>
                </g>
              );
            })}
            <text x={PAD.l} y={H - 5} className="chart-label">{shortDate(grid.dates[0])}</text>
            <text x={W - PAD.r} y={H - 5} className="chart-label" textAnchor="end">{shortDate(grid.dates[grid.dates.length - 1])}</text>
          </svg>
          {ref && (
            <p className="spot-legend"><span className="spot-dash" />{ref.label} ({ref.db.toFixed(1)} dB)</p>
          )}
          {reading && <p className="spot-reading">{reading}</p>}
        </>
      )}
    </div>
  );
}
