"""Check our results against independent data.

galamsey: the NISAR mining-scar footprint against Global Forest Watch tree-cover loss (Hansen et al.,
          Landsat, 30 m, 2001-2024). Nothing in that map comes from radar, so agreement is independent.
floods:   the NISAR flood layer against Sentinel-1 (a different radar, C-band) on the dates around the
          peak: do the same places brighten?

Results go to data/work/validation/<story>.json and are written up in docs/METHODS.md.
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.warp import Resampling, reproject
from rasterio.windows import from_bounds

from . import config
from .export import Grid

OUT_DIR = config.WORK_DIR / "validation"
HANSEN = "https://storage.googleapis.com/earthenginepartners-hansen/GFC-2024-v1.12/Hansen_GFC-2024-v1.12_{layer}_10N_010W.tif"


def _read_window(url: str, bbox) -> tuple[np.ndarray, object]:
    w, s, e, n = bbox
    with rasterio.open(url) as src:
        win = from_bounds(w, s, e, n, src.transform).round_offsets().round_lengths()
        return src.read(1, window=win), src.window_transform(win)


def _to_grid(arr: np.ndarray, transform, grid: Grid) -> np.ndarray:
    out = np.zeros((grid.height, grid.width), dtype="float32")
    reproject(arr.astype("float32"), out, src_transform=transform, src_crs="EPSG:4326",
              dst_transform=grid.transform, dst_crs="EPSG:4326", resampling=Resampling.average)
    return out


def _footprint(story_id: str, date: str | None = None) -> tuple[np.ndarray, str]:
    story = json.loads((config.WEB_DATA_DIR / story_id / "story.json").read_text(encoding="utf-8"))
    frame = story["frames"][0] if date is None else next(f for f in story["frames"] if f["date"] == date)
    path = config.REPO_ROOT / "web" / "public" / frame["footprint"]
    return np.asarray(Image.open(path))[..., 3] > 0, frame["date"]


def validate_galamsey() -> dict:
    """NISAR scars vs Hansen tree-cover loss and tree cover in 2000."""
    story = config.STORIES["galamsey"]
    grid = Grid.for_bbox(story.bbox, story.max_px)
    area = np.broadcast_to(grid.pixel_area_m2(), (grid.height, grid.width))
    scars, date = _footprint("galamsey")

    loss_year, t = _read_window(HANSEN.format(layer="lossyear"), story.bbox)
    cover, t2 = _read_window(HANSEN.format(layer="treecover2000"), story.bbox)
    lost = _to_grid((loss_year > 0).astype("float32"), t, grid)       # share of each cell lost 2001-2024
    tc2000 = _to_grid(cover, t2, grid)                                 # % tree cover in 2000

    lost_cell = lost >= 0.25          # a quarter or more of the 68 m cell lost
    forest2000 = tc2000 >= 50
    def share(mask, of):
        return float(np.sum(area[mask & of]) / np.sum(area[of]))

    # Loss year histogram inside the scars (by area of lost 30 m pixels, approximated per cell).
    years = {}
    for y in range(1, 25):
        frac = _to_grid((loss_year == y).astype("float32"), t, grid)
        years[2000 + y] = round(float(np.sum(area * frac * scars) / 1e6), 2)

    res = {
        "nisarDate": date,
        "hansenVersion": "GFC-2024-v1.12",
        "scarsKm2": round(float(np.sum(area * scars) / 1e6), 1),
        "scarsWithLossShare": round(share(lost_cell, scars), 3),
        "nonScarsWithLossShare": round(share(lost_cell, ~scars), 3),
        "scarsForest2000Share": round(share(forest2000, scars), 3),
        "hansenLossCapturedShare": round(float(np.sum(area * lost * scars) / np.sum(area * lost)), 3),
        "hansenLossKm2InScarsByYear": years,
    }
    return res


def validate_floods() -> dict:
    """Do flooded pixels (NISAR, 21 Sep) also brighten in Sentinel-1 VV/VH, vs the dry season?"""
    import requests

    from .longview import (  # same COG reader works for VV and VH
        HEADERS,
        STAC,
        TOKEN,
        _read_vh,
        _with_retries,
    )

    story = config.STORIES["floods"]
    grid = Grid.for_bbox(story.bbox, story.max_px)
    flood = np.asarray(Image.open(config.WEB_DATA_DIR / "floods" / "2026-09-21_change.png"))[..., 3] > 0
    token = _with_retries(lambda: requests.get(TOKEN, headers=HEADERS, timeout=60).json()["token"])

    def composite(start: str, end: str, pol: str) -> tuple[np.ndarray, int]:
        body = {"collections": ["sentinel-1-rtc"], "bbox": list(story.bbox), "datetime": f"{start}/{end}", "limit": 50}
        feats = _with_retries(lambda: requests.post(STAC, json=body, headers=HEADERS, timeout=120).json()["features"])
        layers = []
        for f in feats:
            try:
                layers.append(_read_vh(f["assets"][pol]["href"] + "?" + token, grid))
            except Exception:  # noqa: BLE001
                print(f"    skipped one {pol} scene", flush=True)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            return 10 * np.log10(np.nanmedian(np.stack(layers), axis=0)), len(layers)

    out = {"nisarDate": "2026-09-21", "floodedPixels": int(flood.sum())}
    for pol in ("vv", "vh"):
        dry, n_dry = composite("2026-07-01", "2026-08-20", pol)      # before the spill
        wet, n_wet = composite("2026-09-14", "2026-09-28", pol)      # around the NISAR peak
        d = wet - dry
        ok = np.isfinite(d)
        # Control: pixels within 2-10 km of the flood but not flooded (same landscape, no flood).
        from scipy.ndimage import distance_transform_edt
        mx = 111_320 * np.cos(np.radians(10.0)) * (story.bbox[2] - story.bbox[0]) / grid.width
        my = 110_574 * (story.bbox[3] - story.bbox[1]) / grid.height
        dist = distance_transform_edt(~flood, sampling=(my, mx))
        ctrl = (dist > 2000) & (dist < 10000)
        out[pol] = {
            "scenesDry": n_dry, "scenesWet": n_wet,
            "floodMedianChangeDb": round(float(np.nanmedian(d[flood & ok])), 2),
            "controlMedianChangeDb": round(float(np.nanmedian(d[ctrl & ok])), 2),
            "floodShareBrighter3Db": round(float(np.mean(d[flood & ok] >= 3)), 3),
            "controlShareBrighter3Db": round(float(np.mean(d[ctrl & ok] >= 3)), 3),
        }
    return out


def run(story_id: str) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    res = validate_galamsey() if story_id == "galamsey" else validate_floods()
    out = OUT_DIR / f"{story_id}.json"
    out.write_text(json.dumps(res, indent=2), encoding="utf-8")
    print(json.dumps(res, indent=2))
    return out
