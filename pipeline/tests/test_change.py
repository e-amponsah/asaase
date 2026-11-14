import numpy as np
from scipy.ndimage import gaussian_filter
from scipy.ndimage import shift as nd_shift

from asaase.config import STORIES
from asaase.process import clean, coregister, drift_offset, flood_classes


def test_drift_offset_ignores_local_change():
    rng = np.random.default_rng(0)
    before = rng.normal(-13, 0.5, (100, 100))
    after = before - 0.8                     # whole scene 0.8 dB darker (season / calibration)
    after[40:60, 40:60] -= 6                 # plus a real clearing
    ref = np.ones_like(before, dtype=bool)
    assert abs(drift_offset(before, after, ref) - (-0.8)) < 0.05


def test_drift_offset_needs_enough_reference_pixels():
    a = np.zeros((5, 5))
    assert drift_offset(a, a + 2, np.ones_like(a, dtype=bool)) == 0.0


def test_flood_classes_separate_double_bounce_from_crop_growth():
    base_hh = np.full((3, 3), -12.0)
    base_hv = np.full((3, 3), -18.0)
    hh = base_hh.copy()
    hv = base_hv.copy()
    hh[0, 0] += 5; hv[0, 0] += 1      # flooded vegetation: HH up much more than HV
    hh[1, 1] += 5; hv[1, 1] += 5      # crop growth / wet soil: both up together
    hh[2, 2] = -24                     # new open water: HH dropped and is water-dark
    open_w, veg = flood_classes(hh, hv, base_hh, base_hv, rise_db=3, hh_over_hv_db=1.5,
                                drop_db=3, water_thr=-18)
    assert veg[0, 0] and not veg[1, 1]
    assert open_w[2, 2] and open_w.sum() == 1


def test_clean_drops_speckle_keeps_patches():
    m = np.zeros((30, 30), dtype=bool)
    m[5, 5] = True                     # single noisy pixel
    m[10:20, 10:20] = True             # real patch
    out = clean(m, min_px=4)
    assert not out[5, 5] and out[15, 15]


def test_main_frames_are_one_pass():
    for s in STORIES.values():
        assert len({(t.direction, t.path) for t in s.main}) == 1


def test_coregister_recovers_a_subpixel_offset():
    rng = np.random.default_rng(1)
    ref = gaussian_filter(rng.normal(0, 1, (128, 128)), 2) * 10 - 12
    moved = nd_shift(ref, (-3.6, 0.7), order=1, mode="nearest")   # like a geolocation error
    aligned, (dy, dx) = coregister(ref, moved)
    assert abs(dy - 3.6) < 0.25 and abs(dx + 0.7) < 0.25
    inner = (slice(10, -10), slice(10, -10))
    assert np.nanmean(np.abs(aligned[inner] - ref[inner])) < np.mean(np.abs(moved[inner] - ref[inner])) / 3


def test_coregister_leaves_aligned_images_alone():
    rng = np.random.default_rng(2)
    ref = gaussian_filter(rng.normal(0, 1, (64, 64)), 2)
    out, shift = coregister(ref, ref + 0.01)
    assert shift == (0.0, 0.0) and out is not ref
