import { useEffect, useRef, useState } from "react";
import type { Basemap } from "./MapView";

interface Props {
  basemap: Basemap;
  onBasemap: (b: Basemap) => void;
  layers: { id: string; label: string; swatch: string; on: boolean; onChange: (v: boolean) => void; hint?: string }[];
}

/** One "Layers" button (top right) that opens the layer switches and the basemap choice. */
export function LayersControl({ basemap, onBasemap, layers }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="layers" ref={ref}>
      <button className={`fab ${open ? "is-on" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="dialog">
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
        <span>Layers</span>
      </button>
      {open && (
        <div className="layers-pop" role="dialog" aria-label="Map layers">
          <p className="pop-title">Radar layers</p>
          {layers.map((l) => (
            <label key={l.id} className="layer-row" title={l.hint}>
              <span className="layer-swatch" style={{ background: l.swatch }} />
              <span className="layer-label">{l.label}</span>
              <input type="checkbox" className="switch" checked={l.on} onChange={(e) => l.onChange(e.target.checked)} />
            </label>
          ))}
          <p className="pop-title">Basemap</p>
          <div className="basemaps">
            {(["dark", "satellite"] as Basemap[]).map((b) => (
              <button key={b} className={`basemap ${basemap === b ? "is-on" : ""}`} onClick={() => onBasemap(b)}>
                <span className={`basemap-thumb ${b}`} aria-hidden="true" />
                {b === "dark" ? "Map" : "Satellite"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
