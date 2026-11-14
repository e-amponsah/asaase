"""Find NISAR GCOV scenes for a story. Searching needs no login."""

from __future__ import annotations

from dataclasses import dataclass

import asf_search as asf

from .config import Story, Track


@dataclass(frozen=True)
class Scene:
    date: str          # YYYY-MM-DD
    track: Track
    pol_mode: str      # DHDH = HH+HV dual-pol, SHSH = HH only
    crid: str
    file_name: str
    url: str


def parse_name(file_name: str) -> dict:
    """Read track and date out of a NISAR product name.

    NISAR_L2_PR_GCOV_034_145_A_005_2005_DHDH_A_20261027T053924_..._P05036_..._001.h5
    index:  0  1  2    3   4   5  6   7    8    9  10        11
    """
    p = file_name.split("_")
    start = p[11]
    crid = next((x for x in p if len(x) == 6 and x[0] in "PT" and x[1:].isdigit()), "")
    return {
        "path": int(p[5]),
        "direction": p[6],
        "frame": int(p[7]),
        "pol_mode": p[9],
        "date": f"{start[0:4]}-{start[4:6]}-{start[6:8]}",
        "crid": crid,
    }


def find_scenes(story: Story, dual_pol_only: bool = True) -> list[Scene]:
    """All scenes on the story's tracks, one per (track, date), newest processing kept."""
    w, s, e, n = story.bbox
    results = asf.search(
        platform="NISAR",
        processingLevel="GCOV",
        intersectsWith=f"POLYGON(({w} {s},{e} {s},{e} {n},{w} {n},{w} {s}))",
        start=story.start,
        end=story.end,
    )
    wanted = {(t.direction, t.path, t.frame): t for t in story.tracks}
    best: dict[tuple, Scene] = {}
    for r in results:
        props = r.properties
        name = props.get("fileName") or props.get("sceneName", "")
        if not name.endswith(".h5"):
            name = f"{name}.h5"
        meta = parse_name(name)
        track = wanted.get((meta["direction"], meta["path"], meta["frame"]))
        if track is None or (dual_pol_only and not meta["pol_mode"].startswith("D")):
            continue
        scene = Scene(meta["date"], track, meta["pol_mode"], meta["crid"], name, props["url"])
        key = (track, scene.date)
        if key not in best or scene.crid > best[key].crid:
            best[key] = scene
    return sorted(best.values(), key=lambda sc: (story.tracks.index(sc.track), sc.date))
