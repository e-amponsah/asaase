import type { Reserves } from "../types";

/** Damage inside each forest reserve: NISAR scars now, and Sentinel-1 growth since 2021. */
export function ReservesSection({ data, onShow }: { data: Reserves; onShow: () => void }) {
  const rs = data.features.map((f) => f.properties).filter((p) => p.areaHa > 0);
  if (!rs.length) return null;
  const total = rs.reduce((a, r) => a + r.scarHa, 0);
  const s21 = rs.reduce((a, r) => a + (r.s1Ha2021 ?? 0), 0);
  const s26 = rs.reduce((a, r) => a + (r.s1Ha2026 ?? 0), 0);
  return (
    <details className="section">
      <summary>
        Inside forest reserves
        <span className="source-tag">{total.toLocaleString("en-GB")} ha</span>
      </summary>
      <p className="lv-lede">
        Mining scars inside the {rs.length} reserves here: <strong>{total.toLocaleString("en-GB")} ha</strong> on NISAR's
        latest pass. In Sentinel-1's dry-season images they grew from about {s21.toLocaleString("en-GB")} ha in 2021
        to {s26.toLocaleString("en-GB")} ha in 2026.{" "}
        <button className="link" onClick={onShow}>Show reserves on the map</button>
      </p>
      <table className="res-table">
        <thead>
          <tr><th>Reserve</th><th>Scars now</th><th>2021 → 2026</th></tr>
        </thead>
        <tbody>
          {rs.map((r) => (
            <tr key={r.name}>
              <td>{r.name.replace(" Forest Reserve", "")}</td>
              <td>{r.scarHa.toLocaleString("en-GB")} ha <span className="muted">({r.scarPct}%)</span></td>
              <td>{r.s1Ha2021 !== undefined && r.s1Ha2026 !== undefined ? `${r.s1Ha2021} → ${r.s1Ha2026} ha` : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note">Reserve boundaries: OpenStreetMap. "Scars now" is the NISAR footprint on the latest pass; the 2021 → 2026 column is Sentinel-1. Percentages are of the part of each reserve inside the study area.</p>
    </details>
  );
}
