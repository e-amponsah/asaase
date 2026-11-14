# Contributing

1. **Branch** from `main` with a short descriptive name: `git switch -c flood-recession-check`.
2. **Commit small and often**, with clear messages (`Add water threshold tuning for floods`).
3. **Open a pull request** early (a draft is fine). Another team member reviews before merge.
4. **Keep `main` demo-ready.** Before merging, check:
   - `npm --prefix web run build` passes;
   - `pytest -q` and `ruff check .` pass in `pipeline/`.

## Never commit

- Earthdata credentials, `.netrc`, `.env` or tokens.
- Raw NISAR files (`*.h5`; several GB each). They live in `data/raw/`, which is git-ignored.

## Where things go

| Change | File |
|---|---|
| Story text, stats, sources | `web/src/content/stories.ts` |
| Colours, spacing, fonts | the tokens at the top of `web/src/styles.css` |
| Study areas, tracks, thresholds | `pipeline/asaase/config.py` |
| Processed layers | `web/public/data/<story>/` (written by `asaase build`; don't edit by hand) |
| New layers from other sources | a new file beside them, e.g. `web/public/data/galamsey/reserves.geojson` |

## Style

- **UI:** stay within the design tokens. Test on a phone-sized screen. Every number shown in the app
  needs a source or must come from our pipeline.
- **Python:** run `ruff check .` and `ruff format .`.
