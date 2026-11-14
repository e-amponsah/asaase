"""Turn downloaded GCOV files into the layers and numbers the web app shows.

Output, per story, in web/public/data/<story>/:
  <date>_base.webp       greyscale backscatter (HV for galamsey, HH for floods)
  <date>_change.png      galamsey: new disturbance since the first pass
                         floods: new open water (blue) + flooded vegetation (violet)
  <date>_footprint.png   galamsey only: all stripped / mined land on that date
  story.json             dates, image paths, coverage, per-date stats and time series
  pixels.json + .bin     coarse per-pixel dB history of the base channel (click-a-spot charts)

Only these files are rewritten; other files in the folder (layers from other sources) are kept.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from scipy.ndimage import shift as nd_shift

from . import config
from .export import Grid, save_classes, save_grey, save_pixel_series
from .process import (
    bounded_otsu,
    clean,
    coregister,
    drift_offset,
    flood_classes,
    hv_drop,
    water_mask,
)
from .scene import load_db, local_dates, mean_db
from .search import parse_name

FOOTPRINT_RGB = (217, 154, 62)   # amber: mining scars (all damaged land)
LOSS_RGB = (240, 90, 60)         # ember: new disturbance since the first pass
OPEN_WATER_RGB = (56, 170, 255)  # sky blue: new open water
FLOODED_VEG_RGB = (180, 140, 255)  # violet: water under vegetation (double bounce)

_OWN = re.compile(r"^(\d{4}-\d{2}-\d{2}_(base|change|footprint)\.(png|webp)|pixels\.(json|bin))$")


def _version(paths: list[Path]) -> str:
    """Processing version (CRID) of a pass, e.g. P05023. Mixed versions are joined with '+'."""
    return "+".join(sorted({parse_name(p.name)["crid"] for p in paths}))


def build_story(story_id: str) -> Path:
    story = config.STORIES[story_id]
    files = local_dates(story)
    if not files:
        raise SystemExit(
            f"No files for {story_id} in {config.RAW_DIR / story_id}. "
            f"Run: asaase download {story_id} --main-track-only"
        )
    grid = Grid.for_bbox(story.bbox, story.max_px)
    out_dir = config.WEB_DATA_DIR / story_id
    out_dir.mkdir(parents=True, exist_ok=True)
    for old in out_dir.iterdir():  # drop our own outputs from earlier builds (dates may change)
        if _OWN.match(old.name):
            old.unlink()

    if story_id == "floods":
        body = _floods(story, files, grid, out_dir)
    else:
        body = _forest(story, files, grid, out_dir)

    manifest = {
        "story": story_id,
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "illustrative": False,
        "track": story.main_label(),
        "bounds": list(story.bbox),
        **body,
    }
    out = out_dir / "story.json"
    out.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return out


# ───────────────────────────── galamsey ─────────────────────────────

def _forest(story, files, grid, out_dir) -> dict:
    area = grid.pixel_area_m2()
    dates = list(files)
    vmin, vmax = config.DB_RANGE["HVHV"]

    base = load_db(files[dates[0]], story, grid, "HVHV")
    if base is None:
        raise SystemExit(f"First pass {dates[0]} does not cover the study area")
    thr = bounded_otsu(base, -24, -13, config.DAMAGE_HV_MAX_DB)
    base_scars = clean(base < thr, config.MIN_PATCH_PX)
    intact = base > thr + 2           # clearly forested: the reference for drift correction
    print(f"  damage threshold HV < {thr:.1f} dB (from {dates[0]})")

    frames, footprint_pts, new_pts, series, series_dates = [], [], [], [], []
    for date in dates:
        hv = load_db(files[date], story, grid, "HVHV")
        if hv is None:
            print(f"  skip {date}: no coverage")
            continue
        hv, offset = coregister(base, hv) if date != dates[0] else (hv, (0.0, 0.0))
        if offset != (0.0, 0.0):
            print(f"  {date}: aligned to {dates[0]} by {offset[0]:+.2f} rows, {offset[1]:+.2f} cols")
        drift = drift_offset(base, hv, intact) if date != dates[0] else 0.0
        hv = hv - drift
        valid = np.isfinite(hv) & np.isfinite(base)

        scars = clean((hv < thr) & np.isfinite(hv), config.MIN_PATCH_PX)
        new = clean((hv_drop(base, hv) >= config.FOREST_LOSS_DROP_DB) & valid & ~base_scars,
                    config.MIN_PATCH_PX)
        scars_km2 = float(np.sum(area * scars) / 1e6)
        new_ha = float(np.sum(area * new) / 1e4)
        coverage = float(np.isfinite(hv).mean())

        save_grey(hv, out_dir / f"{date}_base.webp", vmin, vmax)
        series.append(hv)
        series_dates.append(date)
        save_classes([(scars, FOOTPRINT_RGB)], out_dir / f"{date}_footprint.png", opacity=170)
        save_classes([(new, LOSS_RGB)], out_dir / f"{date}_change.png")
        frames.append({
            "date": date,
            "base": f"data/{story.id}/{date}_base.webp",
            "footprint": f"data/{story.id}/{date}_footprint.png",
            "change": f"data/{story.id}/{date}_change.png",
            "coverage": round(coverage, 3),
            "version": _version(files[date]),
            "stats": {"damagedKm2": round(scars_km2, 2), "newDisturbanceHa": round(new_ha, 1),
                      "driftDb": round(drift, 2), "shiftRows": offset[0], "shiftCols": offset[1]},
        })
        note = config.QUALITY_FLAGS.get(story.id, {}).get(date)
        if note:
            frames[-1]["note"] = note
        else:
            footprint_pts.append({"date": date, "value": round(scars_km2, 2)})
            new_pts.append({"date": date, "value": round(new_ha, 1)})
        print(f"  {date}: damaged {scars_km2:,.1f} km², new {new_ha:,.1f} ha, "
              f"drift {drift:+.2f} dB, coverage {coverage:.0%}")

    save_pixel_series(series, series_dates, story.bbox, "HV", out_dir, story.id)
    return {
        "basePolarization": "HV",
        "frames": frames,
        "series": {"label": "Damaged land", "unit": "km²", "points": footprint_pts},
        "extraSeries": [{"label": "New disturbance since first pass", "unit": "ha", "points": new_pts}],
        "method": {
            "damageThresholdDb": round(thr, 2),
            "newDisturbanceDropDb": config.FOREST_LOSS_DROP_DB,
            "driftCorrection": "median HV change over intact forest, subtracted per pass",
            "coregistration": "each pass aligned to the first by phase correlation if offset ≥ 0.3 px",
            "minPatchPx": config.MIN_PATCH_PX,
        },
    }


# ───────────────────────────── floods ─────────────────────────────

def _floods(story, files, grid, out_dir) -> dict:
    area = grid.pixel_area_m2()
    dates = list(files)
    baseline_dates = [d for d in dates if d < config.FLOOD_BASELINE_BEFORE] or dates[:1]
    print(f"  baseline: {', '.join(baseline_dates)}")
    hh_base = mean_db(baseline_dates, files, story, grid, "HHHH")
    hv_base = mean_db(baseline_dates, files, story, grid, "HVHV")
    _, water_thr = water_mask(hh_base, config.WATER_HH_MAX_DB)
    vmin, vmax = config.DB_RANGE["HHHH"]

    frames, pts, series, series_dates = [], [], [], []
    for date in dates:
        hh = load_db(files[date], story, grid, "HHHH")
        hv = load_db(files[date], story, grid, "HVHV")
        if hh is None or hv is None:
            print(f"  skip {date}: no coverage")
            continue
        hh, offset = coregister(hh_base, hh)
        if offset != (0.0, 0.0):
            hv = nd_shift(hv, offset, order=1, mode="constant", cval=np.nan)
            print(f"  {date}: aligned to the baseline by {offset[0]:+.2f} rows, {offset[1]:+.2f} cols")
        open_w, veg = flood_classes(
            hh, hv, hh_base, hv_base,
            rise_db=config.FLOOD_RISE_DB, hh_over_hv_db=config.FLOOD_HH_OVER_HV_DB,
            drop_db=config.FLOOD_DROP_DB, water_thr=water_thr,
        )
        open_w = clean(open_w, config.MIN_PATCH_PX)
        veg = clean(veg, config.MIN_PATCH_PX)
        open_km2 = float(np.sum(area * open_w) / 1e6)
        veg_km2 = float(np.sum(area * veg) / 1e6)
        coverage = float(np.isfinite(hh).mean())

        save_grey(hh, out_dir / f"{date}_base.webp", vmin, vmax)
        series.append(hh)
        series_dates.append(date)
        save_classes([(veg, FLOODED_VEG_RGB), (open_w, OPEN_WATER_RGB)], out_dir / f"{date}_change.png")
        frames.append({
            "date": date,
            "base": f"data/{story.id}/{date}_base.webp",
            "change": f"data/{story.id}/{date}_change.png",
            "coverage": round(coverage, 3),
            "version": _version(files[date]),
            "baseline": date in baseline_dates,
            "stats": {"openWaterKm2": round(open_km2, 2), "floodedVegetationKm2": round(veg_km2, 2),
                      "shiftRows": offset[0], "shiftCols": offset[1]},
        })
        note = config.QUALITY_FLAGS.get(story.id, {}).get(date)
        if note:
            frames[-1]["note"] = note
        else:
            pts.append({"date": date, "value": round(open_km2 + veg_km2, 2)})
        print(f"  {date}: open water {open_km2:,.1f} km², flooded vegetation {veg_km2:,.1f} km², "
              f"coverage {coverage:.0%}{' (baseline)' if date in baseline_dates else ''}")

    save_pixel_series(series, series_dates, story.bbox, "HH", out_dir, story.id)
    return {
        "basePolarization": "HH",
        "frames": frames,
        "series": {"label": "Flooded area", "unit": "km²", "points": pts},
        "method": {
            "baselineDates": baseline_dates,
            "openWater": f"HH fell ≥ {config.FLOOD_DROP_DB} dB and HH < {water_thr:.1f} dB",
            "floodedVegetation": (f"HH rose ≥ {config.FLOOD_RISE_DB} dB and ≥ "
                                  f"{config.FLOOD_HH_OVER_HV_DB} dB more than HV"),
            "minPatchPx": config.MIN_PATCH_PX,
        },
    }
