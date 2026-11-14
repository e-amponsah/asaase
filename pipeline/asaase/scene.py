"""Find downloaded files per date and load them as one mosaic on the story grid."""

from __future__ import annotations

from pathlib import Path

import numpy as np

from . import config
from .export import Grid, to_grid
from .gcov import read_subset
from .process import lee_filter, to_db
from .search import parse_name


def local_dates(story: config.Story) -> dict[str, list[Path]]:
    """{date: [files]} for downloaded files on the story's main frames, oldest date first."""
    wanted = {(t.direction, t.path, t.frame) for t in story.main}
    out: dict[str, list[Path]] = {}
    for p in sorted((config.RAW_DIR / story.id).glob("NISAR_L2_*GCOV*.h5")):
        m = parse_name(p.name)
        if (m["direction"], m["path"], m["frame"]) in wanted:
            out.setdefault(m["date"], []).append(p)
    return dict(sorted(out.items()))


def load_power(paths: list[Path], story: config.Story, grid: Grid, pol: str) -> np.ndarray | None:
    """Speckle-filtered linear power for one pass, all frames mosaicked onto the story grid.

    Where frames overlap, their values are averaged. Returns None if no frame covers the area.
    """
    layers = []
    for path in paths:
        sub = read_subset(path, story.bbox, pols=(pol,))
        if sub is None or pol not in sub.bands:
            continue
        layers.append(to_grid(lee_filter(sub.bands[pol]), sub, grid))
    if not layers:
        return None
    stack = np.stack(layers)
    with np.errstate(invalid="ignore"), _quiet():
        return np.nanmean(stack, axis=0)


def load_db(paths: list[Path], story: config.Story, grid: Grid, pol: str) -> np.ndarray | None:
    power = load_power(paths, story, grid, pol)
    return None if power is None else to_db(power)


def mean_db(dates: list[str], files: dict[str, list[Path]], story: config.Story,
            grid: Grid, pol: str) -> np.ndarray:
    """Average of several passes (in linear power), returned in dB. Used for baselines."""
    powers = [p for d in dates if (p := load_power(files[d], story, grid, pol)) is not None]
    with np.errstate(invalid="ignore"), _quiet():
        return to_db(np.nanmean(np.stack(powers), axis=0))


class _quiet:
    """Silence numpy's 'mean of empty slice' warning for pixels no frame covers."""

    def __enter__(self):
        import warnings

        self._w = warnings.catch_warnings()
        self._w.__enter__()
        warnings.simplefilter("ignore", RuntimeWarning)

    def __exit__(self, *exc):
        return self._w.__exit__(*exc)
