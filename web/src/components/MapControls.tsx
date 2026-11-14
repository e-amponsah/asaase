import type { Basemap } from "./MapView";

interface Props {
  comparing: boolean;
  onCompare: (on: boolean) => void;
  compareOptions: string[];
  compareDate: string | null;
  onCompareDate: (d: string) => void;
  basemap: Basemap;
  onBasemap: (b: Basemap) => void;
  showBase: boolean;
  onShowBase: (v: boolean) => void;
  showChange: boolean;
  onShowChange: (v: boolean) => void;
  baseLabel: string;
  changeLabel: string;
  changeColor: string;
  formatDate: (d: string) => string;
}

export function MapControls(p: Props) {
  return (
    <>
      <div className="ctrl ctrl-left">
        <div className="segmented" role="group" aria-label="View mode">
          <button className={!p.comparing ? "is-on" : ""} onClick={() => p.onCompare(false)}>Single date</button>
          <button className={p.comparing ? "is-on" : ""} onClick={() => p.onCompare(true)}>Swipe compare</button>
        </div>
        {p.comparing && (
          <label className="ctrl-select">
            <span>Before</span>
            <select value={p.compareDate ?? ""} onChange={(e) => p.onCompareDate(e.target.value)}>
              {p.compareOptions.map((d) => (
                <option key={d} value={d}>{p.formatDate(d)}</option>
              ))}
            </select>
          </label>
        )}
        <div className="toggles">
          <Toggle on={p.showBase} onChange={p.onShowBase} swatch="linear-gradient(90deg,#1b201f,#d9dedc)" label={p.baseLabel} />
          <Toggle on={p.showChange} onChange={p.onShowChange} swatch={p.changeColor} label={p.changeLabel} />
        </div>
      </div>

      <div className="ctrl ctrl-right">
        <div className="segmented small" role="group" aria-label="Basemap">
          <button className={p.basemap === "dark" ? "is-on" : ""} onClick={() => p.onBasemap("dark")}>Map</button>
          <button className={p.basemap === "satellite" ? "is-on" : ""} onClick={() => p.onBasemap("satellite")}>Satellite</button>
        </div>
      </div>
    </>
  );
}

function Toggle({ on, onChange, swatch, label }: { on: boolean; onChange: (v: boolean) => void; swatch: string; label: string }) {
  return (
    <button className={`toggle ${on ? "is-on" : ""}`} onClick={() => onChange(!on)} aria-pressed={on}>
      <span className="toggle-swatch" style={{ background: swatch }} />
      {label}
      <span className="toggle-switch" />
    </button>
  );
}
