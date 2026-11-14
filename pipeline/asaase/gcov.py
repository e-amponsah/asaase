"""Read a lon/lat window out of a NISAR L2 GCOV HDF5 file.

GCOV stores geocoded, terrain-flattened backscatter (gamma0, linear power) on a projected grid:
  /science/LSAR/GCOV/grids/frequencyA/{HHHH, HVHV, xCoordinates, yCoordinates, projection}
We read only the rows and columns covering the study area, so this also works on remote files.
"""

from __future__ import annotations

from dataclasses import dataclass

import h5py
import numpy as np
from pyproj import Transformer

GRID_ROOT = "/science/LSAR/GCOV/grids"


@dataclass
class Subset:
    bands: dict[str, np.ndarray]   # e.g. {"HHHH": array, "HVHV": array}, linear power
    x: np.ndarray                  # projected x of each column (pixel centres)
    y: np.ndarray                  # projected y of each row
    epsg: int

    @property
    def pixel_area_m2(self) -> float:
        return abs(float(self.x[1] - self.x[0]) * float(self.y[1] - self.y[0]))


def _grid_group(f: h5py.File) -> h5py.Group:
    for freq in ("frequencyA", "frequencyB"):
        path = f"{GRID_ROOT}/{freq}"
        if path in f:
            return f[path]
    raise KeyError(f"No GCOV grid found under {GRID_ROOT}")


def _epsg(group: h5py.Group) -> int:
    proj = group["projection"]
    for key in ("epsg_code", "epsg"):
        if key in proj.attrs:
            return int(proj.attrs[key])
    return int(proj[()])


def read_subset(src, bbox: tuple[float, float, float, float],
                pols: tuple[str, ...] = ("HHHH", "HVHV")) -> Subset | None:
    """src: a path or an open file-like object. Returns None if the bbox misses the scene."""
    with h5py.File(src, "r") as f:
        g = _grid_group(f)
        x = g["xCoordinates"][()]
        y = g["yCoordinates"][()]
        epsg = _epsg(g)

        w, s, e, n = bbox
        to_grid = Transformer.from_crs(4326, epsg, always_xy=True)
        xs, ys = to_grid.transform([w, e, w, e], [s, s, n, n])
        cols = np.where((x >= min(xs)) & (x <= max(xs)))[0]
        rows = np.where((y >= min(ys)) & (y <= max(ys)))[0]
        if cols.size == 0 or rows.size == 0:
            return None
        rs = slice(rows.min(), rows.max() + 1)
        cs = slice(cols.min(), cols.max() + 1)

        bands = {}
        for pol in pols:
            if pol in g:
                arr = g[pol][rs, cs].astype("float32")
                arr[arr <= 0] = np.nan
                bands[pol] = arr
        return Subset(bands=bands, x=x[cs], y=y[rs], epsg=epsg)
