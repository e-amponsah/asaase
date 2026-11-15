import { useEffect, useRef } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { STORIES } from "../content/stories";
import type { Theme } from "../lib/useTheme";
import type { StoryId } from "../types";

// Key-free Esri basemaps (attribution required), as on the story maps.
const esri = (service: string) => [`https://server.arcgisonline.com/ArcGIS/rest/services/${service}/MapServer/tile/{z}/{y}/{x}`];

const IDS: StoryId[] = ["galamsey", "floods"];

/** Both study areas as outlined boxes, from the same bounds the stories use. */
const AREAS: FeatureCollection = {
  type: "FeatureCollection",
  features: IDS.map((id) => {
    const [w, s, e, n] = STORIES[id].bounds;
    return {
      type: "Feature",
      properties: { id },
      geometry: { type: "Polygon", coordinates: [[[w, n], [e, n], [e, s], [w, s], [w, n]]] },
    };
  }),
};

const style = (theme: Theme): StyleSpecification => ({
  version: 8,
  projection: { type: "globe" },
  sky: { "atmosphere-blend": 1 },
  sources: {
    base: {
      type: "raster", tileSize: 256, maxzoom: 16,
      tiles: esri(theme === "light" ? "Canvas/World_Light_Gray_Base" : "Canvas/World_Dark_Gray_Base"),
      attribution: "Basemap © Esri, HERE, Garmin, © OpenStreetMap contributors",
    },
    areas: { type: "geojson", data: AREAS },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": theme === "light" ? "#eef1f0" : "#0a0e0d" } },
    { id: "base", type: "raster", source: "base" },
    { id: "areas-fill", type: "fill", source: "areas", paint: { "fill-color": "#e8b23a", "fill-opacity": 0.35 } },
    { id: "areas-line", type: "line", source: "areas", paint: { "line-color": "#e8b23a", "line-width": 1.5 } },
  ],
});

/**
 * A slowly turning Earth for the "How radar sees" page, with Ghana's two study areas marked.
 * Drag to turn it; the labels open each story.
 */
export function LearnGlobe({ theme, onStory }: { theme: Theme; onStory: (id: StoryId) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const storyRef = useRef(onStory);
  storyRef.current = onStory;

  useEffect(() => {
    if (!el.current) return;
    const map = new maplibregl.Map({
      container: el.current,
      style: style(theme),
      center: [-1.2, 8.2],
      // Whole globe at about 80% of the box: its diameter is ~512 · 2^zoom / π px.
      zoom: Math.log2((0.8 * el.current.clientWidth * Math.PI) / 512),
      scrollZoom: false,      // the page scrolls past the globe; drag still turns it
      doubleClickZoom: false,
      dragRotate: false,
      maxPitch: 0,
      attributionControl: { compact: true },
    });

    // Label each study area; clicking opens that story. The forest site sits just south of the flood
    // site, so its label is nudged down and the flood label up to keep the two apart.
    const markers = IDS.map((id) => {
      const [w, s, e, n] = STORIES[id].bounds;
      const b = document.createElement("button");
      b.type = "button";
      b.className = id === "galamsey" ? "site-beacon site-down" : "site-beacon site-up";
      b.setAttribute("aria-label", `Open the story: ${STORIES[id].title}`);
      b.innerHTML = `<span class="site-ring"></span><span class="site-name"></span>`;
      (b.querySelector(".site-name") as HTMLElement).textContent = STORIES[id].title;
      b.addEventListener("click", () => storyRef.current(id));
      return new maplibregl.Marker({ element: b, anchor: "left", offset: [-7, 0] })
        .setLngLat([(w + e) / 2, (s + n) / 2])
        .addTo(map);
    });

    // Turn slowly, Ghana coming round about every 90 s; stop for good once someone drags it.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let spinning = !still;
    let raf = 0;
    let last = 0;
    const turn = (t: number) => {
      if (!spinning) return;
      if (last) {
        const c = map.getCenter();
        const lng = c.lng + ((t - last) / 1000) * 4;     // 4° per second
        map.setCenter([lng > 180 ? lng - 360 : lng, c.lat]);
      }
      last = t;
      raf = requestAnimationFrame(turn);
    };
    const stop = () => { spinning = false; cancelAnimationFrame(raf); };
    map.on("load", () => {
      // Keep the credit line folded into its (i) button so it does not cover the globe.
      el.current?.querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      if (spinning) raf = requestAnimationFrame(turn);
    });
    map.on("mousedown", stop);
    map.on("touchstart", stop);

    return () => {
      stop();
      markers.forEach((m) => m.remove());
      map.remove();
    };
  }, [theme]);

  return <div ref={el} className="learn-globe" role="group" aria-label="Globe showing the two study areas in Ghana" />;
}
