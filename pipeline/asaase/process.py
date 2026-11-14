"""Radar maths: decibels, speckle filtering, water detection and change detection."""

from __future__ import annotations

import numpy as np
from scipy.ndimage import uniform_filter


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


def water_mask(hh_db: np.ndarray, fallback: float) -> tuple[np.ndarray, float]:
    """Open water is very dark in HH. Returns (mask, threshold used)."""
    try:
        t = otsu_threshold(hh_db)
        if not -30 < t < -10:   # histogram not bimodal enough: Otsu picked something silly
            t = fallback
    except ValueError:
        t = fallback
    return (hh_db < t) & np.isfinite(hh_db), t


def hv_drop(hv_db_before: np.ndarray, hv_db_after: np.ndarray) -> np.ndarray:
    """Positive values = HV got darker = likely canopy loss."""
    return hv_db_before - hv_db_after
