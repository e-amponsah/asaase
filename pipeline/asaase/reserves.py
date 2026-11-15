"""Mining damage inside forest reserves (galamsey story).

Reserve boundaries: OpenStreetMap (`boundary=protected_area`, protection title "Forest Reserve"),
fetched once and cached in data/work/reserves_osm.json. For each reserve that overlaps the study
area we measure, on the story grid:

  areaHa             reserve area inside the study area
  scarHa / scarPct   NISAR mining-scar footprint inside it, latest pass
  s1Ha2021, s1Ha2026 Sentinel-1 scar area inside it in the 2021 and 2026 dry seasons (if built)

Writes web/public/data/galamsey/reserves.geojson (outlines clipped to nothing: full OSM outline).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import requests
from PIL import Image, ImageDraw

from . import config
from .export import Grid

OVERPASS = "https://overpass-api.de/api/interpreter"
CACHE = config.WORK_DIR / "reserves_osm.json"
HEADERS = {"User-Agent": "asaase-pipeline/0.1"}


def _fetch(bbox) -> dict:
    if CACHE.exists():
        return json.loads(CACHE.read_text(encoding="utf-8"))
    w, s, e, n = bbox
    q = (f'[out:json][timeout:120];way["boundary"="protected_area"]["protection_title"~"Forest Reserve",i]'
         f"({s},{w},{n},{e});out tags geom;")
    r = requests.post(OVERPASS, data={"data": q}, headers=HEADERS, timeout=200)
    r.raise_for_status()
    data = r.json()
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(data), encoding="utf-8")
    return data


def _mask(ring: list[tuple[float, float]], grid: Grid) -> np.ndarray:
    w, s, e, n = grid.bbox
    img = Image.new("L", (grid.width, grid.height), 0)
    ImageDraw.Draw(img).polygon(
        [((x - w) / (e - w) * grid.width, (n - y) / (n - s) * grid.height) for x, y in ring], fill=1)
    return np.asarray(img).astype(bool)


def _alpha(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path))[..., 3] > 0


def build_reserves(story_id: str = "galamsey") -> Path:
    story = config.STORIES[story_id]
    grid = Grid.for_bbox(story.bbox, story.max_px)
    area = np.broadcast_to(grid.pixel_area_m2(), (grid.height, grid.width))
    web = config.WEB_DATA_DIR / story_id
    sj = json.loads((web / "story.json").read_text(encoding="utf-8"))
    last = sj["frames"][-1]
    scars = _alpha(config.REPO_ROOT / "web" / "public" / last["footprint"])
    s1 = {y: _alpha(web / "longview" / f"{y}.png") for y in (2021, 2026) if (web / "longview" / f"{y}.png").exists()}

    features = []
    for el in _fetch(story.bbox)["elements"]:
        ring = [(p["lon"], p["lat"]) for p in el.get("geometry", [])]
        if len(ring) < 4:
            continue
        m = _mask(ring, grid)
        a_ha = float(area[m].sum() / 1e4)
        if a_ha < 10:          # touches the study area only at the edge
            continue
        props = {
            "name": el["tags"].get("name", "Forest reserve"),
            "source": "OpenStreetMap",
            "areaHa": round(a_ha),
            "scarHa": round(float(area[m & scars].sum() / 1e4)),
            "scarPct": round(100 * float(area[m & scars].sum() / area[m].sum()), 1),
            "asOf": last["date"],
        }
        for y, mask in s1.items():
            props[f"s1Ha{y}"] = round(float(area[m & mask].sum() / 1e4))
        features.append({"type": "Feature", "properties": props,
                         "geometry": {"type": "Polygon", "coordinates": [[[round(x, 5), round(y, 5)] for x, y in ring]]}})
        print(f"  {props['name']}: {props['areaHa']:,} ha in area, scars {props['scarHa']:,} ha ({props['scarPct']}%)"
              + "".join(f", S1 {y}: {props.get(f's1Ha{y}')} ha" for y in s1))

    features.sort(key=lambda f: -f["properties"]["scarHa"])
    out = web / "reserves.geojson"
    out.write_text(json.dumps({"type": "FeatureCollection", "features": features}, separators=(",", ":")),
                   encoding="utf-8")
    return out
