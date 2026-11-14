"""Sentinel-1 long view of the galamsey area: one dry-season radar composite per year, 2016-2026.

NISAR starts in mid-2026, after most of the mining damage was done. Sentinel-1 (C-band, VH) has imaged
Ghana every 12 days since 2015, so it shows how fast the scars spread. We use the radiometrically
terrain-corrected Sentinel-1 product on Microsoft Planetary Computer (`sentinel-1-rtc`), read remotely:
only our window, from the 40 m overview of each cloud-optimized GeoTIFF.

  fetch_longview(story)    per year: median VH (linear) of all Dec-Feb scenes, on the story grid,
                           cached in data/work/longview/<year>.npz
  build_longview(story)    scars per year (VH below a threshold calibrated against the 2026 NISAR
                           footprint) → web/public/data/<story>/longview/<year>.png + longview.json
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import numpy as np
import rasterio
import requests
from rasterio.warp import Resampling, reproject
from rasterio.windows import from_bounds
from scipy.ndimage import binary_erosion

from . import config
from .export import Grid, save_classes
from .process import clean

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
TOKEN = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-1-rtc"
HEADERS = {"User-Agent": "asaase-pipeline/0.1"}
CACHE_DIR = config.WORK_DIR / "longview"
YEARS = range(2016, 2027)
OVERVIEW = 2          # index into the COG overviews [2, 4, 8, ...] → factor 4, about 40 m
MAX_SCENES = 8        # per year: plenty for a stable median
EDGE_TRIM_PX = 5      # at the ~40 m overview: about 200 m
MIN_PATCH_PX = 8      # Sentinel-1 is noisier than NISAR: drop smaller isolated patches
SCAR_RGB = (217, 154, 62)


def _with_retries(fn, tries: int = 5):
    """Call fn(), retrying transient network errors (DNS hiccups, timeouts) with back-off."""
    import time

    for i in range(tries):
        try:
            return fn()
        except requests.RequestException as exc:
            if i == tries - 1:
                raise
            print(f"    network error ({type(exc).__name__}), retrying", flush=True)
            time.sleep(5 * (i + 1))
    return None


def _search(bbox, year: int) -> list[dict]:
    body = {"collections": ["sentinel-1-rtc"], "bbox": list(bbox),
            "datetime": f"{year - 1}-12-01/{year}-02-28", "limit": 100}

    def call():
        r = requests.post(STAC, json=body, headers=HEADERS, timeout=120)
        r.raise_for_status()
        return r.json()["features"]

    feats = _with_retries(call)
    # Spread the scenes over the season and over both orbits.
    feats.sort(key=lambda f: f["properties"]["datetime"])
    step = max(1, len(feats) // MAX_SCENES)
    return feats[::step][: MAX_SCENES * 2]


def _read_vh(href: str, grid: Grid) -> np.ndarray:
    """VH (linear power) for the grid's bbox from one scene, on the story grid (NaN outside the scene)."""
    w, s, e, n = grid.bbox
    out = np.full((grid.height, grid.width), np.nan, dtype="float32")
    with rasterio.open(href, overview_level=OVERVIEW) as src:
        from rasterio.warp import transform_bounds

        left, bottom, right, top = transform_bounds("EPSG:4326", src.crs, w, s, e, n)
        win = from_bounds(left, bottom, right, top, src.transform).intersection(
            rasterio.windows.Window(0, 0, src.width, src.height))
        arr = src.read(1, window=win, boundless=False).astype("float32")
        arr[(arr <= 0) | (arr == src.nodata)] = np.nan
        # Swath edges carry border noise (low values): trim about 300 m off every scene edge.
        valid = binary_erosion(np.isfinite(arr), iterations=EDGE_TRIM_PX, border_value=0)
        arr[~valid] = np.nan
        reproject(arr, out, src_transform=src.window_transform(win), src_crs=src.crs,
                  dst_transform=grid.transform, dst_crs="EPSG:4326",
                  resampling=Resampling.average, src_nodata=np.nan, dst_nodata=np.nan)
    return out


def fetch_longview(story: config.Story) -> list[Path]:
    """Cache one dry-season median VH composite per year (skips years already cached)."""
    from concurrent.futures import ThreadPoolExecutor

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    grid = Grid.for_bbox(story.bbox, story.max_px)
    for year in YEARS:
        out = CACHE_DIR / f"{story.id}_{year}.npz"
        if out.exists():
            continue
        try:
            feats = _search(story.bbox, year)
            token = _with_retries(lambda: requests.get(TOKEN, headers=HEADERS, timeout=60).json()["token"])
        except requests.RequestException:
            print(f"  {year}: catalogue unreachable, skipped (run again to retry)", flush=True)
            continue
        hrefs = [f["assets"]["vh"]["href"] + "?" + token for f in feats]

        def one(h: str) -> np.ndarray | None:
            for _ in range(3):
                try:
                    return _read_vh(h, grid)
                except Exception as exc:  # noqa: BLE001  (transient network errors)
                    print(f"    retry after {type(exc).__name__}", flush=True)
            return None

        with ThreadPoolExecutor(max_workers=4) as pool:
            layers = [a for a in pool.map(one, hrefs) if a is not None]
        if len(layers) < max(2, len(hrefs) // 2):
            print(f"  {year}: only {len(layers)} of {len(hrefs)} scenes read, skipped (run again to retry)")
            continue
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            stack = np.stack(layers)
            med = np.nanmedian(stack, axis=0)
            count = np.isfinite(stack).sum(axis=0)
        dates = sorted(f["properties"]["datetime"][:10] for f in feats)
        np.savez_compressed(out, vh=med.astype("float32"), count=count.astype("uint8"),
                            dates=np.array(dates), scenes=len(layers))
        print(f"  {year}: {len(layers)} scenes, {dates[0]} → {dates[-1]}, "
              f"coverage {np.isfinite(med).mean():.0%}", flush=True)
    return sorted(CACHE_DIR.glob(f"{story.id}_*.npz"))


def _db(vh: np.ndarray) -> np.ndarray:
    with np.errstate(divide="ignore", invalid="ignore"):
        return 10 * np.log10(vh)


CANDIDATES_DB = np.arange(-20.0, -11.9, 0.25)


def calibrate_threshold(vh_db: np.ndarray, nisar_scars: np.ndarray,
                        candidates: np.ndarray = CANDIDATES_DB) -> tuple[float, float]:
    """VH threshold whose scar mask best matches the NISAR footprint (intersection over union)."""
    ok = np.isfinite(vh_db)
    best = (float(candidates[0]), -1.0)
    for t in candidates:
        m = clean((vh_db < t) & ok, MIN_PATCH_PX)
        inter = np.sum(m & nisar_scars & ok)
        union = np.sum((m | nisar_scars) & ok)
        iou = inter / union if union else 0.0
        if iou > best[1]:
            best = (float(t), float(iou))
    return best


def build_longview(story: config.Story) -> Path:
    from PIL import Image

    grid = Grid.for_bbox(story.bbox, story.max_px)
    area = grid.pixel_area_m2()
    out_dir = config.WEB_DATA_DIR / story.id / "longview"
    out_dir.mkdir(parents=True, exist_ok=True)
    caches = {int(p.stem.split("_")[-1]): p for p in CACHE_DIR.glob(f"{story.id}_*.npz")}
    if not caches:
        raise SystemExit(f"No Sentinel-1 composites cached. Run: asaase longview {story.id} --fetch")

    # Calibrate on the latest year against NISAR's first pass (the closest NISAR date to Dec-Feb).
    story_json = json.loads((config.WEB_DATA_DIR / story.id / "story.json").read_text(encoding="utf-8"))
    first = story_json["frames"][0]
    nisar = np.asarray(Image.open(config.REPO_ROOT / "web" / "public" / first["footprint"]))[..., 3] > 0
    latest = int(first["date"][:4])  # the dry season just before NISAR's first pass
    if latest not in caches:
        raise SystemExit(f"Need the {latest} Sentinel-1 composite to calibrate against NISAR. "
                         f"Run: asaase longview {story.id} --fetch")
    thr, iou = calibrate_threshold(_db(np.load(caches[latest])["vh"]), nisar)
    print(f"  VH threshold {thr:.1f} dB (best match with NISAR {first['date']}: IoU {iou:.2f})")

    # Year-to-year calibration: shift each year so intact forest (in the calibration year) matches.
    ref_db = _db(np.load(caches[latest])["vh"])
    forest = ref_db > thr + 1.5

    years = []
    for year in sorted(caches):
        z = np.load(caches[year])
        db = _db(z["vh"])
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            offset = float(np.nanmedian((db - ref_db)[forest]))
        db = db - offset
        ok = np.isfinite(db)
        scars = clean((db < thr) & ok, MIN_PATCH_PX)
        km2 = float(np.sum(area * scars) / 1e6)
        save_classes([(scars, SCAR_RGB)], out_dir / f"{year}.png", opacity=170)
        years.append({"year": year, "image": f"data/{story.id}/longview/{year}.png",
                      "scarKm2": round(km2, 1), "coverage": round(float(ok.mean()), 3),
                      "scenes": int(z["scenes"]), "from": str(z["dates"][0]), "to": str(z["dates"][-1]),
                      "offsetDb": round(offset, 2)})
        print(f"  {year}: scars {km2:,.1f} km², offset {offset:+.2f} dB, coverage {ok.mean():.0%}, "
              f"{int(z['scenes'])} scenes")

    out = out_dir / "longview.json"
    out.write_text(json.dumps({
        "source": "Sentinel-1 RTC (Microsoft Planetary Computer), VH, December-February median per year",
        "bounds": list(story.bbox),
        "thresholdDb": thr,
        "calibration": (f"threshold chosen to best match the NISAR footprint of {first['date']} (IoU {iou:.2f}); "
                        f"each year shifted so intact forest matches {latest}"),
        "years": years,
    }, indent=2), encoding="utf-8")
    return out
