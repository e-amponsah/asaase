"""Interferometric coherence between consecutive passes, from NISAR L2 GUNW products.

Coherence (0-1) measures how much the ground's radar "fingerprint" stays the same between two passes.
Undisturbed bare ground stays coherent; ground that is dug, flooded or moved between passes loses it.
Inside the mining-scar footprint, low coherence therefore marks active digging.

GUNW files are about 2 GB each, but we need only a small window of one layer, so `fetch` reads it
remotely (HTTPS range requests) and caches it in data/work/coherence/. `asaase build` then reads the
cache only, so builds never need the network.
"""

from __future__ import annotations

from pathlib import Path

import asf_search as asf
import h5py
import numpy as np
from pyproj import Transformer

from . import config
from .export import Grid, to_grid
from .gcov import Subset

LAYER = "/science/LSAR/GUNW/grids/frequencyA/unwrappedInterferogram"
CACHE_DIR = config.WORK_DIR / "coherence"


def parse_gunw(name: str) -> dict:
    """NISAR_L2_PR_GUNW_024_145_A_005_025_2000_SH_<ref start>_<ref end>_<sec start>_<sec end>_P05023_..._001

    index:  0  1  2    3   4   5  6   7   8    9   10      11           12          13          14
    """
    p = name.removesuffix(".h5").split("_")
    day = lambda s: f"{s[0:4]}-{s[4:6]}-{s[6:8]}"
    return {
        "path": int(p[5]), "direction": p[6], "frame": int(p[7]), "mode": p[9],
        "ref": day(p[11]), "sec": day(p[13]), "crid": p[15], "version": p[-1],
    }


def find_pairs(story: config.Story) -> dict[tuple[str, str], list[dict]]:
    """{(ref date, sec date): [one product per frame]} for consecutive pairs on the story's main frames.

    Where a frame has several products for a pair (a short fragment, a reprocessed version), the
    latest version is kept, and among those the largest file.
    """
    w, s, e, n = story.bbox
    asf.constants.INTERNAL.CMR_TIMEOUT = 120  # the catalogue can be slow; the default is 30 s
    results = asf.search(platform="NISAR", processingLevel="GUNW",
                         intersectsWith=f"POLYGON(({w} {s},{e} {s},{e} {n},{w} {n},{w} {s}))",
                         start=story.start, end=story.end)
    wanted = {(t.direction, t.path, t.frame) for t in story.main}
    best: dict[tuple, dict] = {}
    for r in results:
        name = r.properties["fileID"]
        m = parse_gunw(name)
        if (m["direction"], m["path"], m["frame"]) not in wanted:
            continue
        size = r.properties.get("bytes")
        size = sum(v["bytes"] for v in size.values()) if isinstance(size, dict) else (size or 0)
        m |= {"name": name, "url": r.properties["url"], "size": size}
        key = (m["ref"], m["sec"], m["frame"])
        if key not in best or (m["version"], m["size"]) > (best[key]["version"], best[key]["size"]):
            best[key] = m
    pairs: dict[tuple[str, str], list[dict]] = {}
    for (ref, sec, _), m in sorted(best.items()):
        pairs.setdefault((ref, sec), []).append(m)
    return pairs


def fetch(story: config.Story) -> list[Path]:
    """Read and cache the coherence window of every pair (skips pairs already cached)."""
    import earthaccess

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    todo = [m for ms in find_pairs(story).values() for m in ms
            if not (CACHE_DIR / f"{m['name']}.npz").exists()]
    if todo:
        from concurrent.futures import ThreadPoolExecutor

        earthaccess.login(strategy="netrc")

        def one(m: dict) -> None:
            label = f"{m['ref']} to {m['sec']}  frame {m['frame']}"
            for attempt in range(3):  # remote reads can hit transient network errors
                try:
                    f = earthaccess.open([m["url"]])[0]
                    try:
                        _cache_window(f, story.bbox, CACHE_DIR / f"{m['name']}.npz")
                    finally:
                        f.close()
                    print(f"  {label}", flush=True)
                    return
                except Exception as exc:  # noqa: BLE001
                    print(f"  {label}: attempt {attempt + 1} failed ({type(exc).__name__})", flush=True)

        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(one, todo))
    return sorted(CACHE_DIR.glob("*.npz"))


def _cache_window(src, bbox, out: Path) -> None:
    with h5py.File(src, "r") as h:
        g = h[LAYER]
        x, y = g["xCoordinates"][()], g["yCoordinates"][()]
        epsg = int(g["projection"][()])
        w, s, e, n = bbox
        xs, ys = Transformer.from_crs(4326, epsg, always_xy=True).transform([w, e, w, e], [s, s, n, n])
        cols = np.where((x >= min(xs)) & (x <= max(xs)))[0]
        rows = np.where((y >= min(ys)) & (y <= max(ys)))[0]
        if cols.size == 0 or rows.size == 0:
            np.savez_compressed(out, coh=np.zeros((0, 0), "float32"), x=x[:0], y=y[:0], epsg=epsg)
            return
        rs, cs = slice(rows.min(), rows.max() + 1), slice(cols.min(), cols.max() + 1)
        coh = g["HH/coherenceMagnitude"][rs, cs].astype("float32")
    coh[(coh <= 0) | (coh > 1)] = np.nan
    np.savez_compressed(out, coh=coh, x=x[cs], y=y[rs], epsg=epsg)


def cached_pairs(story: config.Story) -> dict[tuple[str, str], list[Path]]:
    """{(ref, sec): [cache files]} for pairs already fetched for this story's main frames."""
    wanted = {(t.direction, t.path, t.frame) for t in story.main}
    out: dict[tuple[str, str], list[Path]] = {}
    for p in sorted(CACHE_DIR.glob("NISAR_L2_*GUNW*.npz")):
        m = parse_gunw(p.stem)
        if (m["direction"], m["path"], m["frame"]) in wanted:
            out.setdefault((m["ref"], m["sec"]), []).append(p)
    return dict(sorted(out.items()))


def load_coherence(paths: list[Path], grid: Grid) -> np.ndarray | None:
    """Coherence of one pair on the story grid, frames mosaicked (mean where they overlap)."""
    layers = []
    for p in paths:
        z = np.load(p)
        if z["coh"].size == 0:
            continue
        sub = Subset(bands={}, x=z["x"], y=z["y"], epsg=int(z["epsg"]))
        layers.append(to_grid(z["coh"], sub, grid))
    if not layers:
        return None
    stack = np.stack(layers)
    with np.errstate(invalid="ignore"):
        import warnings

        with warnings.catch_warnings():
            warnings.simplefilter("ignore", RuntimeWarning)
            return np.nanmean(stack, axis=0)
