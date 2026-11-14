"""Study areas, NISAR tracks and paths. One place to change what we process.

Tracks and dates were checked against the ASF archive on 2026-11-14 (see docs/DATA_PLAN.md).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = REPO_ROOT / "data" / "raw"          # downloaded .h5 files (git-ignored)
WORK_DIR = REPO_ROOT / "data" / "work"        # quicklooks, intermediates (git-ignored)
WEB_DATA_DIR = REPO_ROOT / "web" / "public" / "data"  # what the app loads


@dataclass(frozen=True)
class Track:
    direction: str  # "A" ascending or "D" descending
    path: int
    frame: int

    def label(self) -> str:
        return f"{self.direction}{self.path}/{self.frame}"


@dataclass(frozen=True)
class Story:
    id: str
    title: str
    bbox: tuple[float, float, float, float]  # west, south, east, north (lon/lat)
    tracks: tuple[Track, ...]                # first track is the main time series
    start: str
    end: str
    max_px: int = 2048                       # longest side of exported web images


STORIES: dict[str, Story] = {
    "galamsey": Story(
        id="galamsey",
        title="Where the forest went",
        bbox=(-2.10, 5.85, -1.70, 6.15),     # Upper Denkyera East / Offin River corridor
        tracks=(Track("A", 145, 5), Track("D", 8, 86)),
        start="2026-06-15",
        end="2026-10-31",
    ),
    "atewa": Story(
        id="atewa",
        title="Atewa watershed",
        bbox=(-0.68, 6.08, -0.47, 6.35),
        tracks=(Track("A", 44, 5),),
        start="2026-06-15",
        end="2026-10-31",
    ),
    "floods": Story(
        id="floods",
        title="The Volta breathes",
        bbox=(-1.50, 9.45, -0.75, 10.70),    # White Volta, Pwalugu down to Daboya
        # Frames 7 (north) and 6 (south) together cover the area. build.py uses frame 7 only
        # until the mosaic task (D4 in docs/TASKS.md) is done.
        tracks=(Track("A", 44, 7), Track("A", 44, 6)),
        start="2026-06-15",
        end="2026-10-31",
    ),
}

# Display ranges in dB for the greyscale backscatter images.
DB_RANGE = {"HHHH": (-25.0, 0.0), "HVHV": (-30.0, -8.0)}

# Thresholds (dB). Starting points only: tune them on real scenes (task D3 in docs/TASKS.md).
FOREST_LOSS_DROP_DB = 3.0     # HV fall vs. first date that counts as disturbance
WATER_HH_MAX_DB = -18.0       # fallback if Otsu fails
