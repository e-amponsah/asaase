"""Study areas, NISAR tracks and paths. One place to change what we process.

Tracks and dates were checked against the ASF archive on 2026-11-14 (see docs/METHODS.md).
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
    main: tuple[Track, ...]                  # frames of ONE pass, mosaicked into the time series
    start: str
    end: str
    extra: tuple[Track, ...] = ()            # other tracks, for cross-checks only
    max_px: int = 2048                       # longest side of exported web images

    @property
    def tracks(self) -> tuple[Track, ...]:
        return self.main + self.extra

    def main_label(self) -> str:
        t = self.main[0]
        frames = "+".join(str(m.frame) for m in self.main)
        return f"{t.direction}{t.path}/{frames}"


STORIES: dict[str, Story] = {
    "galamsey": Story(
        id="galamsey",
        title="Where the forest went",
        bbox=(-2.10, 5.85, -1.70, 6.15),     # Upper Denkyera East / Offin River corridor
        main=(Track("A", 145, 5), Track("A", 145, 4)),   # frame 5 north, frame 4 south
        extra=(Track("D", 8, 86),),
        start="2026-06-15",
        end="2026-10-31",
    ),
    "atewa": Story(
        id="atewa",
        title="Atewa watershed",
        bbox=(-0.68, 6.08, -0.47, 6.35),
        main=(Track("A", 44, 5),),
        start="2026-06-15",
        end="2026-10-31",
    ),
    "floods": Story(
        id="floods",
        title="The Volta breathes",
        bbox=(-1.50, 9.45, -0.75, 10.70),    # White Volta, Pwalugu down to Daboya
        main=(Track("A", 44, 7), Track("A", 44, 6)),     # frame 7 north, frame 6 south
        start="2026-06-15",
        end="2026-10-31",
    ),
}

# Display ranges in dB for the greyscale backscatter images.
DB_RANGE = {"HHHH": (-25.0, 0.0), "HVHV": (-30.0, -8.0)}

# ── Thresholds (dB). Starting points, tuned against optical imagery (see docs/METHODS.md). ──

# Galamsey
DAMAGE_HV_MAX_DB = -17.0      # fallback: HV below this = stripped / mined land (Otsu tried first)
FOREST_LOSS_DROP_DB = 3.0     # HV fall vs. first date (after drift correction) = new disturbance

# Floods (change from a dry, pre-spill baseline)
FLOOD_BASELINE_BEFORE = "2026-08-20"   # passes before this form the baseline (Bagré spill ~28 Aug)
FLOOD_RISE_DB = 3.0           # HH brightening that counts as flooded vegetation (double bounce)...
FLOOD_HH_OVER_HV_DB = 1.5     # ...only if HH rose this much MORE than HV (rules out crop growth)
FLOOD_DROP_DB = 3.0           # HH darkening that counts as new open water...
WATER_HH_MAX_DB = -18.0       # ...if also darker than this (fallback when Otsu fails)

# Minimum patch size kept in masks, in pixels of the story grid (removes speckle).
MIN_PATCH_PX = 4

# Passes we show on the map but leave out of the charts, with the reason shown in the app.
QUALITY_FLAGS: dict[str, dict[str, str]] = {
    "galamsey": {
        "2026-09-28": ("This pass came with a geolocation error of about 80 m. We realigned it, but "
                       "steep slopes still show false change, so it is left out of the chart."),
    },
}
