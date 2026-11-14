"""Go/no-go check: before vs after vs difference for two dates, as one PNG.

Answers "is the change actually visible?" before we invest in the full build.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

from . import config  # noqa: E402
from .build import local_scenes  # noqa: E402
from .export import Grid, to_grid  # noqa: E402
from .gcov import read_subset  # noqa: E402
from .process import lee_filter, to_db  # noqa: E402


def quicklook(story_id: str, before: str | None = None, after: str | None = None) -> Path:
    story = config.STORIES[story_id]
    scenes = dict(local_scenes(story))
    if len(scenes) < 2:
        raise SystemExit(f"Need at least 2 downloaded dates for {story_id}, found {len(scenes)}")
    dates = sorted(scenes)
    before, after = before or dates[0], after or dates[-1]
    pol = "HHHH" if story_id == "floods" else "HVHV"
    grid = Grid.for_bbox(story.bbox, 1400)

    def load(date: str):
        sub = read_subset(scenes[date], story.bbox)
        return to_db(to_grid(lee_filter(sub.bands[pol]), sub, grid))

    a, b = load(before), load(after)
    vmin, vmax = config.DB_RANGE[pol]
    fig, axes = plt.subplots(1, 3, figsize=(18, 7), constrained_layout=True)
    ext = [story.bbox[0], story.bbox[2], story.bbox[1], story.bbox[3]]
    for ax, img, title in ((axes[0], a, before), (axes[1], b, after)):
        ax.imshow(img, cmap="gray", vmin=vmin, vmax=vmax, extent=ext)
        ax.set_title(f"{pol[:2]} backscatter, {title}")
    d = axes[2].imshow(b - a, cmap="RdBu", vmin=-6, vmax=6, extent=ext)
    axes[2].set_title(f"Change (dB), {after} minus {before}")
    fig.colorbar(d, ax=axes[2], shrink=0.7, label="dB  (red = darker = loss / water)")
    fig.suptitle(f"Asaase quicklook: {story.title}  ·  track {story.tracks[0].label()}")

    out = config.WORK_DIR / f"quicklook_{story_id}_{before}_{after}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=110)
    return out
