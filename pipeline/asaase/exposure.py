"""People living in and near the detected flood water, per pass (floods story).

Inputs (git-ignored, in data/work/exposure/):
  gha_ppp_2020_UNadj_constrained.tif   WorldPop 2020, Ghana, 100 m, constrained to built-up areas
  osm_places_floods.json               OpenStreetMap place nodes (city/town/village/hamlet), Overpass JSON

Reads the flood overlay of each pass after the spill (web/public/data/floods/<date>_change.png; any
non-transparent pixel is flood water) and writes web/public/data/floods/exposure.json:

  peopleInside     WorldPop people on flood-water pixels
  peopleWithin1km  people within 1 km of flood water (including inside)
  communities      OSM settlements within 1 km of flood water, with people within 1 km of each

Numbers are rounded (to the nearest 10 below 1,000, else 100): WorldPop is a model, not a census.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.windows import from_bounds
from scipy.ndimage import distance_transform_edt

from . import config

EXPOSURE_DIR = config.WORK_DIR / "exposure"
WORLDPOP = EXPOSURE_DIR / "gha_ppp_2020_UNadj_constrained.tif"
OSM_PLACES = EXPOSURE_DIR / "osm_places_floods.json"
BUFFER_M = 1000.0
PLACE_RADIUS_M = 1000.0
MAX_COMMUNITIES = 12


def _round(n: float) -> int:
    return int(round(n, -1) if n < 1000 else round(n, -2))


def _metres_per_degree(lat: float) -> tuple[float, float]:
    return 111_320.0 * np.cos(np.radians(lat)), 110_574.0


def build_exposure(story_id: str = "floods") -> Path:
    out_dir = config.WEB_DATA_DIR / story_id
    story = json.loads((out_dir / "story.json").read_text(encoding="utf-8"))
    w, s, e, n = story["bounds"]

    with rasterio.open(WORLDPOP) as src:
        win = from_bounds(w, s, e, n, src.transform).round_offsets().round_lengths()
        pop = src.read(1, window=win).astype("float64")
        pop[(pop < 0) | ~np.isfinite(pop)] = 0
        t = src.window_transform(win)
    rows, cols = pop.shape
    pop_lon = t.c + (np.arange(cols) + 0.5) * t.a          # pixel centres
    pop_lat = t.f + (np.arange(rows) + 0.5) * t.e

    places = [
        {"name": el["tags"]["name"], "lon": el["lon"], "lat": el["lat"], "kind": el["tags"]["place"]}
        for el in json.loads(OSM_PLACES.read_text(encoding="utf-8"))["elements"]
        if el.get("tags", {}).get("name") and w <= el["lon"] <= e and s <= el["lat"] <= n
    ]

    frames = {}
    for f in story["frames"]:
        if f.get("baseline"):
            continue  # dry passes: any detection there is a false alarm, not flood
        mask = np.asarray(Image.open(config.REPO_ROOT / "web" / "public" / f["change"]))[..., 3] > 0
        h, wd = mask.shape
        mx, my = _metres_per_degree((s + n) / 2)
        dist = distance_transform_edt(~mask, sampling=((n - s) / h * my, (e - w) / wd * mx))

        # Look up each WorldPop pixel's distance to flood water (nearest story-grid pixel).
        r = np.clip(((n - pop_lat) / (n - s) * h).astype(int), 0, h - 1)
        c = np.clip(((pop_lon - w) / (e - w) * wd).astype(int), 0, wd - 1)
        d = dist[r[:, None], c[None, :]]
        inside = float(pop[d == 0].sum())
        near = float(pop[d <= BUFFER_M].sum())

        hits = []
        for p in places:
            pr = min(h - 1, max(0, int((n - p["lat"]) / (n - s) * h)))
            pc = min(wd - 1, max(0, int((p["lon"] - w) / (e - w) * wd)))
            if dist[pr, pc] > BUFFER_M:
                continue
            pmx, pmy = _metres_per_degree(p["lat"])
            dd = np.hypot((pop_lon[None, :] - p["lon"]) * pmx, (pop_lat[:, None] - p["lat"]) * pmy)
            hits.append({"name": p["name"], "lon": round(p["lon"], 4), "lat": round(p["lat"], 4),
                         "kind": p["kind"], "distanceM": int(round(dist[pr, pc], -1)),
                         "people": _round(float(pop[dd <= PLACE_RADIUS_M].sum()))})
        hits.sort(key=lambda x: (-x["people"], x["distanceM"]))
        frames[f["date"]] = {
            "peopleInside": _round(inside),
            "peopleWithin1km": _round(near),
            "communitiesWithin1km": len(hits),
            "communities": hits[:MAX_COMMUNITIES],
        }
        print(f"  {f['date']}: {near:,.0f} people within 1 km ({inside:,.0f} on flood water), "
              f"{len(hits)} communities")

    out = out_dir / "exposure.json"
    out.write_text(json.dumps({
        "source": "WorldPop 2020 constrained (UN-adjusted), 100 m; OpenStreetMap places",
        "bufferM": BUFFER_M,
        "note": "Modelled population, rounded. Dry baseline passes are left out.",
        "frames": frames,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    return out
