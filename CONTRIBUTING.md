# Working together

1. **Pick a task** from [docs/TASKS.md](docs/TASKS.md) and put your name on it.
2. **Branch** from `main`: `git switch -c d2-go-no-go`.
3. **Commit small and often**, with clear messages (`Add water threshold tuning for floods`).
4. **Open a pull request** early (draft is fine). Link the task ID in the title, e.g. `D2: go/no-go quicklooks`.
   Another teammate reviews before merge.
5. **Keep `main` demo-ready.** Before merging, check:
   - `npm --prefix web run build` passes;
   - `pytest -q` passes in `pipeline/`.

## Never commit

- Earthdata credentials, `.netrc`, `.env` or tokens.
- Raw NISAR files (`*.h5`; they are gigabytes each). They live in `data/raw/`, which is git-ignored.

## Where things go

| Change | File |
|---|---|
| Story text, stats, sources | `web/src/content/stories.ts` |
| Colours, spacing, fonts | the tokens at the top of `web/src/styles.css` |
| Study areas, tracks, thresholds | `pipeline/asaase/config.py` |
| New processed layers | `web/public/data/<story>/` (written by `asaase build`) |

## Style

- **UI:** stay within the design tokens, so no new colours without a reason. Test on a phone-sized
  screen. Every number shown in the app needs a source or must come from our pipeline.
- **Python:** run `ruff check .` and `ruff format .`.
