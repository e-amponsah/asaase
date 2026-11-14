import { useEffect, useRef, useState } from "react";
import maplibregl, { type ImageSource, type Map as MLMap, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { shortDate } from "../lib/format";
import type { Bounds, Frame, Place } from "../types";

export type Basemap = "dark" | "satellite";

interface Props {
  bounds: Bounds;
  storyKey: string;
  places: Place[];
  frame?: Frame;
  compareFrame?: Frame;
  date: string;
  compareDate: string | null;
  basemap: Basemap;
  showBase: boolean;
  showChange: boolean;
  hasData: boolean;
}

// Keeps the study area clear of the floating controls (top) and timeline (bottom).
const FIT_PADDING = { top: 96, bottom: 150, left: 48, right: 48 };

// Key-free Esri basemaps (attribution required).
const esri = (service: string) => [`https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`];

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    dark: { type: "raster", tiles: esri("Canvas/World_Dark_Gray_Base"), tileSize: 256, maxzoom: 16, attribution: "Basemap © Esri, HERE, Garmin, © OpenStreetMap contributors" },
    satellite: { type: "raster", tiles: esri("World_Imagery"), tileSize: 256, maxzoom: 18, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
    labels: { type: "raster", tiles: esri("Canvas/World_Dark_Gray_Reference"), tileSize: 256, maxzoom: 16 },
    aoi: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0a0e0d" } },
    { id: "dark", type: "raster", source: "dark" },
    { id: "satellite", type: "raster", source: "satellite", layout: { visibility: "none" }, paint: { "raster-saturation": -0.25 } },
    { id: "aoi-fill", type: "fill", source: "aoi", paint: { "fill-color": "#e8b23a", "fill-opacity": 0.05 } },
    { id: "aoi-line", type: "line", source: "aoi", paint: { "line-color": "#e8b23a", "line-width": 1.5, "line-dasharray": [3, 2] } },
    { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.85 } },
  ],
};

const corners = ([w, s, e, n]: Bounds): [[number, number], [number, number], [number, number], [number, number]] => [
  [w, n], [e, n], [e, s], [w, s],
];

function aoiFeature(b: Bounds): GeoJSON.FeatureCollection {
  const c = corners(b);
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...c, c[0]]] } }],
  };
}

function setImages(map: MLMap, frame: Frame | undefined, bounds: Bounds, showBase: boolean, showChange: boolean) {
  const layers: [string, string | undefined, boolean, number][] = [
    ["radar-base", frame?.base, showBase, 0.95],
    ["radar-change", frame?.change, showChange, 1],
  ];
  for (const [id, url, show, opacity] of layers) {
    if (!url) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
      continue;
    }
    const href = new URL(url, document.baseURI).href;
    const src = map.getSource(id) as ImageSource | undefined;
    if (src) src.updateImage({ url: href, coordinates: corners(bounds) });
    else {
      map.addSource(id, { type: "image", url: href, coordinates: corners(bounds) });
      map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": opacity, "raster-fade-duration": 0 } }, "aoi-fill");
    }
    map.setLayoutProperty(id, "visibility", show ? "visible" : "none");
  }
}

function placeMarker(p: Place) {
  const el = document.createElement("div");
  el.className = "place";
  el.innerHTML = `<span class="place-dot"></span><span class="place-name"></span>`;
  (el.querySelector(".place-name") as HTMLElement).textContent = p.name;
  return new maplibregl.Marker({ element: el, anchor: "left" }).setLngLat([p.lon, p.lat]);
}

export function MapView(props: Props) {
  const { bounds, storyKey, places, frame, compareFrame, date, compareDate, basemap, showBase, showChange, hasData } = props;
  const mainEl = useRef<HTMLDivElement>(null);
  const cmpEl = useRef<HTMLDivElement>(null);
  const maps = useRef<{ main: MLMap; cmp: MLMap } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [split, setSplit] = useState(50);
  const comparing = compareDate !== null;

  // Create both maps once. The second one is only shown in swipe-compare mode.
  useEffect(() => {
    if (!mainEl.current || !cmpEl.current) return;
    // Each map gets its own copy: MapLibre mutates the style object it is given.
    const opts = { bounds: bounds as [number, number, number, number], fitBoundsOptions: { padding: FIT_PADDING }, maxPitch: 0, dragRotate: false };
    const main = new maplibregl.Map({ ...opts, style: structuredClone(STYLE), container: mainEl.current, attributionControl: { compact: true } });
    const cmp = new maplibregl.Map({ ...opts, style: structuredClone(STYLE), container: cmpEl.current, attributionControl: false });
    main.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    main.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    let lock = false;
    const follow = (src: MLMap, dst: MLMap) => () => {
      if (lock) return;
      lock = true;
      dst.jumpTo({ center: src.getCenter(), zoom: src.getZoom() });
      lock = false;
    };
    main.on("move", follow(main, cmp));
    cmp.on("move", follow(cmp, main));

    let n = 0;
    const onLoad = () => { if (++n === 2) setLoaded(true); };
    main.on("load", onLoad);
    cmp.on("load", onLoad);
    maps.current = { main, cmp };
    if (import.meta.env.DEV) (window as unknown as { __asaase: unknown }).__asaase = maps.current;
    return () => {
      main.remove();
      cmp.remove();
      maps.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Story change: outline, places, fly there.
  useEffect(() => {
    if (!loaded || !maps.current) return;
    const { main, cmp } = maps.current;
    const markers = [main, cmp].flatMap((m) => {
      (m.getSource("aoi") as maplibregl.GeoJSONSource).setData(aoiFeature(bounds));
      return places.map((p) => placeMarker(p).addTo(m));
    });
    main.fitBounds(bounds as [number, number, number, number], { padding: FIT_PADDING, duration: 1400 });
    return () => markers.forEach((mk) => mk.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, storyKey]);

  useEffect(() => {
    if (!loaded || !maps.current) return;
    for (const m of [maps.current.main, maps.current.cmp]) {
      m.setLayoutProperty("dark", "visibility", basemap === "dark" ? "visible" : "none");
      m.setLayoutProperty("satellite", "visibility", basemap === "satellite" ? "visible" : "none");
    }
  }, [loaded, basemap]);

  useEffect(() => {
    if (!loaded || !maps.current) return;
    setImages(maps.current.main, frame, bounds, showBase, showChange);
    setImages(maps.current.cmp, compareFrame, bounds, showBase, showChange);
  }, [loaded, frame, compareFrame, bounds, showBase, showChange]);

  useEffect(() => {
    if (comparing) maps.current?.cmp.resize();
  }, [comparing]);

  const startDrag = (e: React.PointerEvent) => {
    const stage = (e.currentTarget as HTMLElement).parentElement!;
    const rect = stage.getBoundingClientRect();
    const move = (ev: PointerEvent) => setSplit(Math.min(95, Math.max(5, ((ev.clientX - rect.left) / rect.width) * 100)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="map-wrap">
      <div ref={mainEl} className="map" />
      <div
        ref={cmpEl}
        className="map map-compare"
        style={{ visibility: comparing ? "visible" : "hidden", clipPath: `inset(0 ${100 - split}% 0 0)` }}
        aria-hidden={!comparing}
      />
      {comparing && (
        <>
          <div className="swipe" style={{ left: `${split}%` }} onPointerDown={startDrag} role="separator" aria-label="Drag to compare dates">
            <span className="swipe-knob">
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M6 4 2 9l4 5M12 4l4 5-4 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </div>
          <span className="swipe-label left">Before · {shortDate(compareDate!)}</span>
          <span className="swipe-label right">After · {shortDate(date)}</span>
        </>
      )}
      {!hasData && (
        <div className="map-notice" role="status">
          <span className="pulse" />
          Study area shown. Radar layers appear here once the pipeline has run for this story.
        </div>
      )}
    </div>
  );
}
