"""Command line: asaase {search,download,quicklook,build} <story>"""

from __future__ import annotations

import argparse

from . import config


def main(argv: list[str] | None = None) -> None:
    ap = argparse.ArgumentParser(prog="asaase", description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    stories = sorted(config.STORIES)

    s = sub.add_parser("search", help="list NISAR scenes for a story (no login needed)")
    s.add_argument("story", choices=stories)
    s.add_argument("--all-pols", action="store_true", help="include HH-only scenes")

    d = sub.add_parser("download", help="download scenes (needs Earthdata login)")
    d.add_argument("story", choices=stories)
    d.add_argument("--dates", nargs="*", help="only these YYYY-MM-DD dates")
    d.add_argument("--main-track-only", action="store_true")

    q = sub.add_parser("quicklook", help="before/after/difference PNG for the go/no-go check")
    q.add_argument("story", choices=stories)
    q.add_argument("--before")
    q.add_argument("--after")

    b = sub.add_parser("build", help="write web layers and story.json for the app")
    b.add_argument("story", choices=stories)

    args = ap.parse_args(argv)

    if args.cmd in ("search", "download"):
        from .search import find_scenes

        story = config.STORIES[args.story]
        scenes = find_scenes(story, dual_pol_only=not getattr(args, "all_pols", False))
        if args.cmd == "download":
            if args.main_track_only:
                scenes = [x for x in scenes if x.track == story.tracks[0]]
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

        print(quicklook(args.story, args.before, args.after))
    elif args.cmd == "build":
        from .build import build_story

        print(build_story(args.story))


if __name__ == "__main__":
    main()
