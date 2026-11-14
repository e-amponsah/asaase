"""Go/no-go check: before vs after vs difference for two dates, as one PNG.

Answers "is the change actually visible?" before we invest in the full build.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from . import config
from .export import Grid
from .process import bounded_otsu, drift_offset
from .scene import load_db, local_dates


def quicklook(story_id: str, before: str | None = None, after: str | None = None,
              pol: str | None = None) -> Path:
    story = config.STORIES[story_id]
    files = local_dates(story)
    if len(files) < 2:
        raise SystemExit(f"Need at least 2 downloaded dates for {story_id}, found {len(files)}")
    dates = list(files)
    before, after = before or dates[0], after or dates[-1]
    pol = {"HH": "HHHH", "HV": "HVHV"}[(pol or ("HH" if story_id == "floods" else "HV")).upper()]
    grid = Grid.for_bbox(story.bbox, 1400)

    a = load_db(files[before], story, grid, pol)
    b = load_db(files[after], story, grid, pol)

    # Remove any scene-wide shift (season, calibration), measured over the brighter half of
    # the scene, so the difference panel shows local change only.
    ref = a > bounded_otsu(a, -30, -5, float("nan")) if pol == "HVHV" else a > -1e9
    drift = drift_offset(a, b, ref)

    vmin, vmax = config.DB_RANGE[pol]
    fig, axes = plt.subplots(1, 3, figsize=(18, 7), constrained_layout=True)
    ext = [story.bbox[0], story.bbox[2], story.bbox[1], story.bbox[3]]
    for ax, img, title in ((axes[0], a, before), (axes[1], b, after)):
        ax.imshow(img, cmap="gray", vmin=vmin, vmax=vmax, extent=ext)
        ax.set_title(f"{pol[:2]} backscatter, {title}")
    d = axes[2].imshow(b - a - drift, cmap="RdBu", vmin=-6, vmax=6, extent=ext)
    axes[2].set_title(f"Change (dB), {after} minus {before}\n(scene drift {drift:+.2f} dB removed)")
    fig.colorbar(d, ax=axes[2], shrink=0.7, label="dB  (red = darker, blue = brighter)")
    fig.suptitle(f"Asaase quicklook: {story.title}  ·  {story.main_label()}  ·  {pol[:2]}")

    out = config.WORK_DIR / f"quicklook_{story_id}_{pol[:2]}_{before}_{after}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=110)
    return out
