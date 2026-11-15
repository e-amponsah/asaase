import type { LongView } from "../types";

interface Props {
  data: LongView;
  year: number | null;
  onYear: (year: number | null) => void;
}

const H = 120;

/** "How fast the scars spread": Sentinel-1 scar area per dry season; click a year to map it. */
export function LongViewCard({ data, year, onYear }: Props) {
  const ys = data.years;
  if (!ys.length) return null;
  const max = Math.max(...ys.map((y) => y.scarKm2)) * 1.1;
  const first = ys[0];
  const last = ys[ys.length - 1];
  const span = [];
  for (let y = first.year; y <= last.year; y++) span.push(y);
  const byYear = new Map(ys.map((y) => [y.year, y]));
  const ratio = last.scarKm2 / Math.min(...ys.map((y) => y.scarKm2));

  return (
    <details className="section" open>
      <summary>
        How fast the scars spread
        <span className="source-tag">Sentinel-1 · {first.year}–{last.year}</span>
      </summary>
      <p className="lv-lede">
        Mining scars in the dry season of each year, from Sentinel-1 radar.
        {" "}<strong>{Math.round(last.scarKm2)} km²</strong> in {last.year}, about {ratio.toFixed(1)}× the low point.
        {" "}Pick a year to see it on the map.
      </p>
      <div className="lv-bars" role="group" aria-label="Scar area per year">
        {span.map((y) => {
          const d = byYear.get(y);
          const on = year === y;
          return (
            <button
              key={y}
              className={`lv-bar ${on ? "is-on" : ""} ${d ? "" : "is-missing"}`}
              disabled={!d}
              onClick={() => onYear(on ? null : y)}
              title={d ? `${y}: ${d.scarKm2} km² (dry season ${d.from} to ${d.to}, ${d.scenes} scenes)` : `${y}: no composite`}
              aria-pressed={on}
            >
              <span className="lv-fill" style={{ height: d ? `${(d.scarKm2 / max) * H}px` : "3px" }} />
              <span className="lv-year">{String(y).slice(2)}</span>
            </button>
          );
        })}
      </div>
      {year !== null && byYear.get(year) && (
        <p className="note">
          Showing {year}: {byYear.get(year)!.scarKm2} km² of scars (Dec–Feb median of {byYear.get(year)!.scenes} passes).
          {" "}<button className="link" onClick={() => onYear(null)}>Back to NISAR 2026</button>
        </p>
      )}
      <p className="note">
        Sentinel-1 is C-band radar, coarser than NISAR for this job; its scar line is set to match NISAR's
        2026 footprint. Years with too few passes are left out.
      </p>
    </details>
  );
}
