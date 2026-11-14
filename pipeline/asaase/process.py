"""Radar maths: decibels, speckle filtering, thresholds, and the two change detectors."""

from __future__ import annotations

import numpy as np
from scipy.ndimage import binary_opening, label, uniform_filter


def to_db(power: np.ndarray) -> np.ndarray:
    with np.errstate(divide="ignore", invalid="ignore"):
        return 10.0 * np.log10(power)


def lee_filter(power: np.ndarray, size: int = 5) -> np.ndarray:
    """Classic Lee speckle filter on linear power. Keeps edges sharper than a plain mean."""
    valid = np.isfinite(power)
    img = np.where(valid, power, 0.0)
    count = uniform_filter(valid.astype("float32"), size)
    with np.errstate(divide="ignore", invalid="ignore"):
        mean = uniform_filter(img, size) / count
        sq_mean = uniform_filter(img * img, size) / count
    var = np.maximum(sq_mean - mean * mean, 0)
    noise = np.nanmean(var)
    weight = var / (var + noise + 1e-12)
    out = mean + weight * (img - mean)
    out[~valid] = np.nan
    return out


def otsu_threshold(values: np.ndarray, bins: int = 256) -> float:
    """Threshold that best splits a bimodal histogram (e.g. water vs land in HH dB)."""
    v = values[np.isfinite(values)]
    hist, edges = np.histogram(v, bins=bins)
    centres = (edges[:-1] + edges[1:]) / 2
    w0 = np.cumsum(hist)
    w1 = w0[-1] - w0
    m0 = np.cumsum(hist * centres) / np.maximum(w0, 1)
    m1 = (np.sum(hist * centres) - np.cumsum(hist * centres)) / np.maximum(w1, 1)
    between = w0 * w1 * (m0 - m1) ** 2
    return float(centres[np.argmax(between)])


def bounded_otsu(values: np.ndarray, lo: float, hi: float, fallback: float) -> float:
    """Otsu, but fall back to a fixed value if the histogram isn't bimodal enough."""
    try:
        t = otsu_threshold(values)
    except ValueError:
        return fallback
    return t if lo < t < hi else fallback


def clean(mask: np.ndarray, min_px: int) -> np.ndarray:
    """Remove speckle: a 3x3 opening, then drop patches smaller than min_px pixels."""
    m = binary_opening(mask.astype(bool), structure=np.ones((3, 3)))
    if min_px <= 1:
        return m
    lab, n = label(m)
    if n == 0:
        return m
    sizes = np.bincount(lab.ravel())
    keep = sizes >= min_px
    keep[0] = False
    return keep[lab]


def water_mask(hh_db: np.ndarray, fallback: float) -> tuple[np.ndarray, float]:
    """Open water is very dark in HH. Returns (mask, threshold used)."""
    t = bounded_otsu(hh_db, -30, -10, fallback)
    return (hh_db < t) & np.isfinite(hh_db), t


def drift_offset(before_db: np.ndarray, after_db: np.ndarray, ref: np.ndarray) -> float:
    """Scene-wide shift between two passes, measured over stable reference pixels.

    Seasonal moisture and calibration can darken or brighten a whole scene a little. Measuring
    the median change over intact forest and subtracting it keeps that out of change maps.
    """
    d = (after_db - before_db)[ref & np.isfinite(before_db) & np.isfinite(after_db)]
    return float(np.median(d)) if d.size >= 100 else 0.0


def hv_drop(hv_db_before: np.ndarray, hv_db_after: np.ndarray) -> np.ndarray:
    """Positive values = HV got darker = likely canopy loss."""
    return hv_db_before - hv_db_after


def flood_classes(hh: np.ndarray, hv: np.ndarray, hh_base: np.ndarray, hv_base: np.ndarray, *,
                  rise_db: float, hh_over_hv_db: float, drop_db: float,
                  water_thr: float) -> tuple[np.ndarray, np.ndarray]:
    """Flooding relative to a dry baseline. Returns (new_open_water, flooded_vegetation).

    - New open water: HH fell sharply AND is now water-dark (smooth water mirrors the pulse away).
    - Flooded vegetation: HH rose sharply AND much more than HV. Water under plants creates a
      double bounce that boosts HH; plain crop growth or wet soil raises HH and HV together.
    """
    dhh = hh - hh_base
    dhv = hv - hv_base
    ok = np.isfinite(dhh) & np.isfinite(dhv)
    open_water = ok & (dhh <= -drop_db) & (hh < water_thr)
    flooded_veg = ok & (dhh >= rise_db) & ((dhh - dhv) >= hh_over_hv_db)
    return open_water, flooded_veg
