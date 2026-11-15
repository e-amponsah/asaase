"""Named rivers for the map, from OpenStreetMap (`waterway=river`).

Writes web/public/data/<story>/rivers.geojson: one MultiLineString per river name, thinned to
points at least ~50 m apart, plus a label point inside the study area. Cached Overpass response:
data/work/rivers_<story>.json.
"""

from __future__ import annotations

import json
from pathlib import Path

import requests

from . import config

OVERPASS = "https://overpass-api.de/api/interpreter"
HEADERS = {"User-Agent": "asaase-pipeline/0.1"}
MIN_STEP_DEG = 0.0005   # about 50 m: plenty for a line drawn at regional zoom

# Rivers worth naming on each story's map, with the label we show (OSM spelling → our spelling).
KEEP = {
    "floods": {"White Volta": "White Volta", "Kulpawn": "Kulpawn", "Sissili River": "Sissili", "Nasia": "Nasia"},
    "galamsey": {"Ofin": "Offin River", "Oda": "Oda River"},
}


def _fetch(story: config.Story) -> dict:
    cache = config.WORK_DIR / f"rivers_{story.id}.json"
    if cache.exists():
        return json.loads(cache.read_text(encoding="utf-8"))
    w, s, e, n = story.bbox
    pad = 0.15
    q = (f'[out:json][timeout:120];way["waterway"="river"]["name"]'
         f"({s - pad},{w - pad},{n + pad},{e + pad});out tags geom;")
    r = requests.post(OVERPASS, data={"data": q}, headers=HEADERS, timeout=200)
    r.raise_for_status()
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(r.text, encoding="utf-8")
    return r.json()


def _thin(line: list[tuple[float, float]]) -> list[list[float]]:
    out = [line[0]]
    for x, y in line[1:-1]:
        px, py = out[-1]
        if abs(x - px) + abs(y - py) >= MIN_STEP_DEG:
            out.append((x, y))
    out.append(line[-1])
    return [[round(x, 5), round(y, 5)] for x, y in out]


def build_rivers(story_id: str) -> Path:
    keep = KEEP.get(story_id)
    story = config.STORIES[story_id]
    w, s, e, n = story.bbox
    lines: dict[str, list[list[list[float]]]] = {}
    for el in _fetch(story)["elements"]:
        name = el.get("tags", {}).get("name", "")
        geom = [(p["lon"], p["lat"]) for p in el.get("geometry", [])]
        if not name or len(geom) < 2 or "Border" in name:
            continue
        if keep and name not in keep:
            continue
        lines.setdefault(name, []).append(_thin(geom))

    features = []
    for name, parts in lines.items():
        inside = [pt for part in parts for pt in part if w <= pt[0] <= e and s <= pt[1] <= n]
        if len(inside) < 20:        # barely touches the study area
            continue
        label = inside[int(len(inside) * 0.45)]
        shown = keep.get(name, name) if keep else name
        features.append({"type": "Feature", "properties": {"name": shown, "osmName": name, "labelLon": label[0], "labelLat": label[1]},
                         "geometry": {"type": "MultiLineString", "coordinates": parts}})
        print(f"  {name}: {sum(len(p) for p in parts)} points")
    out = config.WEB_DATA_DIR / story_id / "rivers.geojson"
    out.write_text(json.dumps({"type": "FeatureCollection", "source": "OpenStreetMap contributors (ODbL)",
                               "features": features}, separators=(",", ":")), encoding="utf-8")
    return out
