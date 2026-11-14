"""Put every scene on one fixed lon/lat grid per story, and write web-ready PNG overlays.

A fixed grid means every date lines up pixel for pixel, so change detection is a plain
subtraction and the app can reuse one set of image bounds (the story bbox).
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_bounds, from_origin
from rasterio.warp import Resampling, reproject

from .gcov import Subset


@dataclass(frozen=True)
class Grid:
    bbox: tuple[float, float, float, float]  # west, south, east, north
    width: int
    height: int

    @classmethod
    def for_bbox(cls, bbox: tuple[float, float, float, float], max_px: int) -> Grid:
        w, s, e, n = bbox
        ground_w = (e - w) * math.cos(math.radians((s + n) / 2))
        ground_h = n - s
        if ground_w >= ground_h:
            width, height = max_px, max(1, round(max_px * ground_h / ground_w))
        else:
            width, height = max(1, round(max_px * ground_w / ground_h)), max_px
        return cls(bbox, width, height)

    @property
    def transform(self):
        return from_bounds(*self.bbox, self.width, self.height)

    def pixel_area_m2(self) -> np.ndarray:
        """Area of each row's pixels in m² (shrinks with latitude). Shape (height, 1)."""
        w, s, e, n = self.bbox
        lat = n - (np.arange(self.height) + 0.5) * (n - s) / self.height
        dlon = (e - w) / self.width
        dlat = (n - s) / self.height
        r = 6_371_008.8
        return (np.radians(dlon) * r * np.cos(np.radians(lat)) * np.radians(dlat) * r)[:, None]


def to_grid(arr: np.ndarray, sub: Subset, grid: Grid) -> np.ndarray:
    """Reproject one band from the GCOV projected grid onto the story's lon/lat grid."""
    dx = float(sub.x[1] - sub.x[0])
    dy = float(sub.y[1] - sub.y[0])
    if dy > 0:  # rows run south to north: flip so row 0 is the top
        arr = arr[::-1]
        top = float(sub.y[-1]) + dy / 2
    else:
        top = float(sub.y[0]) - dy / 2
    src_transform = from_origin(float(sub.x[0]) - dx / 2, top, dx, abs(dy))

    out = np.full((grid.height, grid.width), np.nan, dtype="float32")
    reproject(
        np.ascontiguousarray(arr, dtype="float32"), out,
        src_transform=src_transform, src_crs=rasterio.crs.CRS.from_epsg(sub.epsg),
        dst_transform=grid.transform, dst_crs="EPSG:4326",
        resampling=Resampling.average, src_nodata=np.nan, dst_nodata=np.nan,
    )
    return out


def save_grey(db: np.ndarray, path: Path, vmin: float, vmax: float) -> None:
    """Greyscale backscatter image, transparent where there is no data."""
    norm = np.clip((db - vmin) / (vmax - vmin), 0, 1)
    grey = np.nan_to_num(norm * 255).astype("uint8")
    alpha = np.where(np.isfinite(db), 255, 0).astype("uint8")
    _save_rgba(np.dstack([grey, grey, grey, alpha]), path)


def save_mask(mask: np.ndarray, path: Path, rgb: tuple[int, int, int], opacity: int = 220) -> None:
    """Single-colour overlay (water, disturbance), transparent elsewhere."""
    m = mask.astype(bool)
    rgba = np.zeros((*m.shape, 4), dtype="uint8")
    rgba[m] = (*rgb, opacity)
    _save_rgba(rgba, path)


def save_classes(layers: list[tuple[np.ndarray, tuple[int, int, int]]], path: Path,
                 opacity: int = 225) -> None:
    """Several masks in one overlay, each in its own colour. Later layers paint on top."""
    h, w = layers[0][0].shape
    rgba = np.zeros((h, w, 4), dtype="uint8")
    for mask, rgb in layers:
        rgba[mask.astype(bool)] = (*rgb, opacity)
    _save_rgba(rgba, path)


def _save_rgba(rgba: np.ndarray, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(rgba, "RGBA").save(path, optimize=True)
