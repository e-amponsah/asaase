import { useEffect, useRef, useState } from "react";
import maplibregl, { type ImageSource, type Map as MLMap, type StyleSpecification } from "maplibre-gl";
import { shortDate } from "../lib/format";
import type { Theme } from "../lib/useTheme";
import type { Bounds, Community, Frame, Place, Reserves, Rivers } from "../types";

export type Basemap = "dark" | "satellite";

interface Props {
  bounds: Bounds;
  storyKey: string;
  focus?: Bounds;
  outlines?: string;
  reserves?: Reserves | null;
  showReserves?: boolean;
  rivers?: Rivers | null;
  showRivers?: boolean;
  places: Place[];
  communities?: Community[];
  spot?: { lon: number; lat: number } | null;
  longview?: string | null;   // Sentinel-1 scar image of one year: replaces the NISAR layers
  onSpot?: (lon: number, lat: number) => void;
  frame?: Frame;
  compareFrame?: Frame;
  date: string;
  compareDate: string | null;
  basemap: Basemap;
  theme?: Theme;
  showBase: boolean;
  showFootprint: boolean;
  showChange: boolean;
  hasData: boolean;
}

// Keeps the study area clear of the floating controls (top) and timeline (bottom).
/** Padding that keeps the study area clear of the floating panel (desktop) and the time bar. */
const fitPadding = () =>
  window.matchMedia("(max-width: 860px)").matches
    ? { top: 70, bottom: 110, left: 24, right: 24 }
    : { top: 72, bottom: 120, left: 440, right: 72 };

// Key-free Esri basemaps (attribution required).
const esri = (service: string) => [`https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`];

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    dark: { type: "raster", tiles: esri("Canvas/World_Dark_Gray_Base"), tileSize: 256, maxzoom: 16, attribution: "Basemap © Esri, HERE, Garmin, © OpenStreetMap contributors" },
    satellite: { type: "raster", tiles: esri("World_Imagery"), tileSize: 256, maxzoom: 18, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
    labels: { type: "raster", tiles: esri("Canvas/World_Dark_Gray_Reference"), tileSize: 256, maxzoom: 16 },
    light: { type: "raster", tiles: esri("Canvas/World_Light_Gray_Base"), tileSize: 256, maxzoom: 16, attribution: "Basemap © Esri, HERE, Garmin, © OpenStreetMap contributors" },
    lightLabels: { type: "raster", tiles: esri("Canvas/World_Light_Gray_Reference"), tileSize: 256, maxzoom: 16 },
    aoi: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    outlines: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    reserves: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
    rivers: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#0a0e0d" } },
    { id: "dark", type: "raster", source: "dark" },
    { id: "light", type: "raster", source: "light", layout: { visibility: "none" } },
    { id: "satellite", type: "raster", source: "satellite", layout: { visibility: "none" }, paint: { "raster-saturation": -0.25 } },
    { id: "aoi-fill", type: "fill", source: "aoi", paint: { "fill-color": "#ffffff", "fill-opacity": 0 } },
    { id: "aoi-line", type: "line", source: "aoi", paint: { "line-color": "#ffffff", "line-opacity": 0.35, "line-width": 1 } },
    { id: "reserves-fill", type: "fill", source: "reserves", layout: { visibility: "none" }, paint: { "fill-color": "#2fa36b", "fill-opacity": 0.1 } },
    { id: "reserves-line", type: "line", source: "reserves", layout: { visibility: "none" }, paint: { "line-color": "#4cd08a", "line-width": 1.6, "line-dasharray": [3, 2] } },
    { id: "rivers-halo", type: "line", source: "rivers", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#0b1a2a", "line-width": 3.4, "line-opacity": 0.45 } },
    { id: "rivers", type: "line", source: "rivers", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#5cb8ff", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 1.2, 12, 2.4] } },
    { id: "outlines", type: "line", source: "outlines", paint: { "line-color": "#ffffff", "line-width": 1.6, "line-dasharray": [2, 1.5], "line-opacity": 0.95 } },
    { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.85 } },
    { id: "labels-light", type: "raster", source: "lightLabels", layout: { visibility: "none" }, paint: { "raster-opacity": 0.9 } },
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

interface Visible {
  base: boolean;
  footprint: boolean;
  change: boolean;
}

function setImages(map: MLMap, frame: Frame | undefined, bounds: Bounds, show: Visible) {
  // Bottom to top: backscatter, mining scars, change. Each is inserted below the AOI outline.
  const layers: [string, string | undefined, boolean, number][] = [
    ["radar-base", frame?.base, show.base, 0.95],
    ["radar-footprint", frame?.footprint, show.footprint, 1],
    ["radar-change", frame?.change, show.change, 1],
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
      // The radar image is mostly bright forest: take the glare off so the data layers read first.
      const tone = id === "radar-base" ? { "raster-brightness-max": 0.82, "raster-contrast": 0.08 } : {};
      map.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": opacity, "raster-fade-duration": 0, ...tone } }, "aoi-fill");
    }
    map.setLayoutProperty(id, "visibility", show ? "visible" : "none");
  }
}

function placeMarker(p: Place) {
  const el = document.createElement("div");
  el.className = p.side === "left" ? "place place-left" : "place";
  el.innerHTML = `<span class="place-dot"></span><span class="place-name"></span>`;
  (el.querySelector(".place-name") as HTMLElement).textContent = p.name;
  return new maplibregl.Marker({ element: el, anchor: p.side === "left" ? "right" : "left" }).setLngLat([p.lon, p.lat]);
}

export function MapView(props: Props) {
  const { bounds, focus, outlines, reserves = null, showReserves = false, rivers = null, showRivers = true, storyKey, places, communities = [], spot = null, longview = null, onSpot, frame, compareFrame, date, compareDate, basemap, theme = "dark", showBase, showFootprint, showChange, hasData } = props;
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
    const opts = { bounds: bounds as [number, number, number, number], fitBoundsOptions: { padding: fitPadding() }, maxPitch: 0, dragRotate: false };
    // preserveDrawingBuffer: the share card copies the main map's last frame.
    const main = new maplibregl.Map({ ...opts, preserveDrawingBuffer: true, style: structuredClone(STYLE), container: mainEl.current, attributionControl: { compact: true } });
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
      (m.getSource("outlines") as maplibregl.GeoJSONSource).setData(
        outlines ? new URL(outlines, document.baseURI).href : { type: "FeatureCollection", features: [] });
      return places.map((p) => placeMarker(p).addTo(m));
    });
    main.fitBounds((focus ?? bounds) as [number, number, number, number], { padding: fitPadding(), duration: 1400 });
    return () => markers.forEach((mk) => mk.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, storyKey]);

  // Click anywhere for that spot's history. Both maps listen: in swipe mode the left side is the
  // compare map. The latest handler is kept in a ref so the listeners are attached once.
  const spotHandler = useRef(onSpot);
  spotHandler.current = onSpot;
  useEffect(() => {
    if (!loaded || !maps.current) return;
    const { main, cmp } = maps.current;
    const onClick = (e: maplibregl.MapMouseEvent) => spotHandler.current?.(e.lngLat.lng, e.lngLat.lat);
    main.on("click", onClick);
    cmp.on("click", onClick);
    main.getCanvas().style.cursor = "crosshair";
    cmp.getCanvas().style.cursor = "crosshair";
    return () => { main.off("click", onClick); cmp.off("click", onClick); };
  }, [loaded]);

  // Pin on the clicked spot (main map only).
  useEffect(() => {
    if (!loaded || !maps.current || !spot) return;
    const el = document.createElement("div");
    el.className = "spot-pin";
    const mk = new maplibregl.Marker({ element: el }).setLngLat([spot.lon, spot.lat]).addTo(maps.current.main);
    return () => { mk.remove(); };
  }, [loaded, spot]);

  // Forest reserves (galamsey): outline + light fill, switched from the Layers menu.
  useEffect(() => {
    if (!loaded || !maps.current) return;
    for (const m of [maps.current.main, maps.current.cmp]) {
      (m.getSource("reserves") as maplibregl.GeoJSONSource).setData(reserves ?? { type: "FeatureCollection", features: [] });
      const vis = reserves && showReserves ? "visible" : "none";
      m.setLayoutProperty("reserves-fill", "visibility", vis);
      m.setLayoutProperty("reserves-line", "visibility", vis);
    }
  }, [loaded, reserves, showReserves]);

  // Rivers (OpenStreetMap): lines on both maps, a name label on the main map.
  useEffect(() => {
    if (!loaded || !maps.current) return;
    for (const m of [maps.current.main, maps.current.cmp]) {
      (m.getSource("rivers") as maplibregl.GeoJSONSource).setData(rivers ?? { type: "FeatureCollection", features: [] });
      for (const id of ["rivers", "rivers-halo"]) m.setLayoutProperty(id, "visibility", showRivers ? "visible" : "none");
    }
    if (!showRivers || !rivers) return;
    const labels = rivers.features.map((f) => {
      const el = document.createElement("div");
      el.className = "river-label";
      el.textContent = f.properties.name;
      return new maplibregl.Marker({ element: el }).setLngLat([f.properties.labelLon, f.properties.labelLat]).addTo(maps.current!.main);
    });
    return () => labels.forEach((l) => l.remove());
  }, [loaded, rivers, showRivers]);

  // Settlements near flood water on the current pass (main map only).
  const communityKey = communities.map((c) => c.name).join("|");
  useEffect(() => {
    if (!loaded || !maps.current) return;
    const main = maps.current.main;
    const markers = communities.map((c) => {
      const mk = placeMarker(c);
      mk.getElement().classList.add("community");
      return mk.addTo(main);
    });
    return () => markers.forEach((mk) => mk.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, communityKey]);

  useEffect(() => {
    if (!loaded || !maps.current) return;
    for (const m of [maps.current.main, maps.current.cmp]) {
      // "Map" follows the interface theme; satellite imagery is the same in both.
      const map = basemap === "dark";
      m.setLayoutProperty("dark", "visibility", map && theme === "dark" ? "visible" : "none");
      m.setLayoutProperty("light", "visibility", map && theme === "light" ? "visible" : "none");
      m.setLayoutProperty("satellite", "visibility", basemap === "satellite" ? "visible" : "none");
      m.setLayoutProperty("labels", "visibility", !map || theme === "dark" ? "visible" : "none");
      m.setLayoutProperty("labels-light", "visibility", map && theme === "light" ? "visible" : "none");
      m.setPaintProperty("bg", "background-color", theme === "light" ? "#eef1f0" : "#0a0e0d");
    }
  }, [loaded, basemap, theme]);

  useEffect(() => {
    if (!loaded || !maps.current) return;
    const show = { base: showBase, footprint: showFootprint, change: showChange };
    const main = maps.current.main;
    setImages(main, longview ? undefined : frame, bounds, show);
    setImages(maps.current.cmp, compareFrame, bounds, show);
    // Sentinel-1 long view: one year's scars on their own layer.
    const id = "radar-longview";
    if (longview) {
      const href = new URL(longview, document.baseURI).href;
      const src = main.getSource(id) as ImageSource | undefined;
      if (src) src.updateImage({ url: href, coordinates: corners(bounds) });
      else {
        main.addSource(id, { type: "image", url: href, coordinates: corners(bounds) });
        main.addLayer({ id, type: "raster", source: id, paint: { "raster-opacity": 1, "raster-fade-duration": 0 } }, "aoi-fill");
      }
      main.setLayoutProperty(id, "visibility", "visible");
    } else if (main.getLayer(id)) {
      main.setLayoutProperty(id, "visibility", "none");
    }
  }, [loaded, frame, compareFrame, bounds, showBase, showFootprint, showChange, longview]);

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
