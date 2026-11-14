"""Turn downloaded GCOV files into the layers and numbers the web app shows.

Output, per story, in web/public/data/<story>/:
  <date>_base.png        greyscale backscatter (HV for galamsey, HH for floods)
  <date>_change.png      disturbance (galamsey) or open water (floods) overlay
  story.json             dates, image paths, bounds and the time series
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from . import config
from .export import Grid, save_grey, save_mask, to_grid
from .gcov import read_subset
from .process import hv_drop, lee_filter, to_db, water_mask
from .search import parse_name

LOSS_RGB = (240, 90, 60)     # ember: canopy lost
WATER_RGB = (56, 170, 255)   # sky blue: open water


def local_scenes(story: config.Story) -> list[tuple[str, Path]]:
    """(date, path) for downloaded files on the story's main track, oldest first."""
    main = story.tracks[0]
    out = {}
    for p in sorted((config.RAW_DIR / story.id).glob("NISAR_L2_*GCOV*.h5")):
        m = parse_name(p.name)
        if (m["direction"], m["path"], m["frame"]) == (main.direction, main.path, main.frame):
            out[m["date"]] = p
    return sorted(out.items())


def build_story(story_id: str) -> Path:
    story = config.STORIES[story_id]
    scenes = local_scenes(story)
    if not scenes:
        raise SystemExit(
            f"No files for {story_id} in {config.RAW_DIR / story_id}. "
            f"Run: asaase download {story_id}"
        )

    grid = Grid.for_bbox(story.bbox, story.max_px)
    area = grid.pixel_area_m2()
    out_dir = config.WEB_DATA_DIR / story_id
    is_flood = story_id == "floods"
    base_pol = "HHHH" if is_flood else "HVHV"
    vmin, vmax = config.DB_RANGE[base_pol]

    frames, series, baseline = [], [], None
    for date, path in scenes:
        sub = read_subset(path, story.bbox)
        if sub is None or base_pol not in sub.bands:
            print(f"  skip {date}: no {base_pol} over the study area")
            continue
        db = to_db(to_grid(lee_filter(sub.bands[base_pol]), sub, grid))
        save_grey(db, out_dir / f"{date}_base.png", vmin, vmax)

        if is_flood:
            mask, thr = water_mask(db, config.WATER_HH_MAX_DB)
            value = float(np.sum(area * mask) / 1e6)            # km²
            note = f"water threshold {thr:.1f} dB"
            change_rgb = WATER_RGB
        else:
            if baseline is None:
                baseline = db
            mask = (hv_drop(baseline, db) >= config.FOREST_LOSS_DROP_DB) & np.isfinite(db)
            value = float(np.sum(area * mask) / 1e4)            # hectares
            note = f"HV drop ≥ {config.FOREST_LOSS_DROP_DB} dB vs {scenes[0][0]}"
            change_rgb = LOSS_RGB

        save_mask(mask, out_dir / f"{date}_change.png", change_rgb)
        frames.append({
            "date": date,
            "base": f"data/{story_id}/{date}_base.png",
            "change": f"data/{story_id}/{date}_change.png",
        })
        series.append({"date": date, "value": round(value, 2)})
        print(f"  {date}: {value:,.1f} ({note})")

    manifest = {
        "story": story_id,
        "generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "illustrative": False,
        "track": story.tracks[0].label(),
        "bounds": list(story.bbox),
        "basePolarization": base_pol[:2],
        "frames": frames,
        "series": {
            "label": "Open water" if is_flood else "Canopy disturbance",
            "unit": "km²" if is_flood else "ha",
            "points": series,
        },
    }
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "story.json"
    out.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return out
