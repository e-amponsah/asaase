"""Command line: asaase {search,download,quicklook,coherence,exposure,longview,validate,reserves,build} <story>"""

from __future__ import annotations

import argparse
import sys

from . import config


def main(argv: list[str] | None = None) -> None:
    for stream in (sys.stdout, sys.stderr):  # Windows consoles default to cp1252: keep ², → and ≥ printable
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(prog="asaase", description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    stories = sorted(config.STORIES)

    s = sub.add_parser("search", help="list NISAR scenes for a story (no login needed)")
    s.add_argument("story", choices=stories)
    s.add_argument("--all-pols", action="store_true", help="include HH-only scenes")

    d = sub.add_parser("download", help="download scenes (needs Earthdata login)")
    d.add_argument("story", choices=stories)
    d.add_argument("--dates", nargs="*", help="only these YYYY-MM-DD dates")
    d.add_argument("--main-track-only", action="store_true",
                   help="only the frames used for the time series (skip cross-check tracks)")

    q = sub.add_parser("quicklook", help="before/after/difference PNG for the go/no-go check")
    q.add_argument("story", choices=stories)
    q.add_argument("--before")
    q.add_argument("--after")
    q.add_argument("--pol", choices=["HH", "HV", "hh", "hv"],
                   help="polarization (default HV for galamsey, HH for floods)")

    b = sub.add_parser("build", help="write web layers and story.json for the app")
    b.add_argument("story", choices=stories)

    rs = sub.add_parser("reserves", help="mining damage inside forest reserves (galamsey)")
    rs.add_argument("story", choices=["galamsey"])

    v = sub.add_parser("validate", help="check results against independent data (Hansen loss, Sentinel-1)")
    v.add_argument("story", choices=stories)

    lv = sub.add_parser("longview", help="Sentinel-1 yearly scar layers, 2016-2026 (galamsey)")
    lv.add_argument("story", choices=["galamsey"])
    lv.add_argument("--fetch", action="store_true", help="read and cache the yearly composites first")

    x = sub.add_parser("exposure", help="people in and near the flood water per pass (floods only)")
    x.add_argument("story", choices=["floods"])

    c = sub.add_parser("coherence", help="fetch coherence windows from GUNW pairs (reads remotely, caches)")
    c.add_argument("story", choices=stories)

    args = ap.parse_args(argv)

    if args.cmd in ("search", "download"):
        from .search import find_scenes

        story = config.STORIES[args.story]
        scenes = find_scenes(story, dual_pol_only=not getattr(args, "all_pols", False))
        if args.cmd == "download":
            if args.main_track_only:
                scenes = [x for x in scenes if x.track in story.main]
            if args.dates:
                scenes = [x for x in scenes if x.date in set(args.dates)]
            from .download import download

            paths = download(scenes, story.id)
            print(f"{len(paths)} file(s) in {config.RAW_DIR / story.id}")
        else:
            for x in scenes:
                print(f"{x.date}  {x.track.label():<9} {x.pol_mode}  {x.crid}  {x.file_name}")
            print(f"\n{len(scenes)} scene(s)")
    elif args.cmd == "quicklook":
        from .quicklook import quicklook

        print(quicklook(args.story, args.before, args.after, args.pol))
    elif args.cmd == "reserves":
        from .reserves import build_reserves

        print(build_reserves(args.story))
    elif args.cmd == "validate":
        from .validate import run

        print(run(args.story))
    elif args.cmd == "longview":
        from .longview import build_longview, fetch_longview

        story = config.STORIES[args.story]
        if args.fetch:
            fetch_longview(story)
        print(build_longview(story))
    elif args.cmd == "exposure":
        from .exposure import build_exposure

        print(build_exposure(args.story))
    elif args.cmd == "coherence":
        from .coherence import fetch

        paths = fetch(config.STORIES[args.story])
        print(f"{len(paths)} cached coherence window(s) in {config.WORK_DIR / 'coherence'}")
    elif args.cmd == "build":
        from .build import build_story

        print(build_story(args.story))


if __name__ == "__main__":
    main()
