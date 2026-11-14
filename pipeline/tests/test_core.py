import numpy as np

from asaase.export import Grid
from asaase.process import otsu_threshold, water_mask
from asaase.search import parse_name


def test_parse_name():
    m = parse_name(
        "NISAR_L2_PR_GCOV_034_145_A_005_2005_DHDH_A_20261022T053924_20261022T053959_P05036_N_F_J_001.h5"
    )
    assert m == {"path": 145, "direction": "A", "frame": 5, "pol_mode": "DHDH",
                 "date": "2026-10-22", "crid": "P05036"}


def test_otsu_splits_water_from_land():
    rng = np.random.default_rng(0)
    water = rng.normal(-24, 1.5, 4000)
    land = rng.normal(-8, 2.0, 6000)
    t = otsu_threshold(np.concatenate([water, land]))
    assert -20 < t < -12
    mask, used = water_mask(np.concatenate([water, land]), fallback=-18)
    assert 0.35 < mask.mean() < 0.45 and used == t


def test_grid_area_is_sane():
    g = Grid.for_bbox((-2.0, 6.0, -1.9, 6.1), 500)
    total_km2 = g.pixel_area_m2().sum() * g.width / 1e6
    assert 110 < total_km2 < 130   # ~0.1° x 0.1° near 6°N ≈ 122 km²
