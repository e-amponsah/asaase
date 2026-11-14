# Asaase

**Ghana's changing land and water, seen through cloud by NASA-ISRO NISAR radar.**

*Asaase* means "earth" in Twi. This is our entry for the NASA Space Apps Challenge 2026,
[Dancing with the SARs](https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/).

Two stories, one app:

| Story | Where | What the radar shows |
|---|---|---|
| **Where the forest went** | Offin River / Upper Denkyera East (galamsey belt) | Canopy loss from illegal mining: L-band HV backscatter drops when forest is cleared |
| **The Volta breathes** | White Volta, Pwalugu to Daboya | Flooding from the late-August 2026 Bagré Dam spill: open water goes black in HH |

Plus **How radar sees**, a one-page explainer of mirror, canopy and double-bounce scattering,
and **Listen to the land**, which plays each story's time series as a drum rhythm.

## Repository layout

```
asaase/
├── web/        React + TypeScript + MapLibre app (static, deploys to GitHub Pages)
├── pipeline/   Python: find, download and process NISAR GCOV into web layers
├── data/       Local downloads and intermediates (git-ignored)
└── docs/
    ├── TASKS.md       Task board: who is doing what
    └── DATA_PLAN.md   Tracks, dates, signals and the go/no-go check
```

## Quick start: web app

Needs Node 18 or newer.

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

Until the pipeline has produced output, each story shows its study area and an
**Illustrative** chart (clearly badged). Real radar layers appear automatically once
`web/public/data/<story>/story.json` exists.

## Quick start: data pipeline

Needs Python 3.10 or newer.

```bash
cd pipeline
python -m venv .venv
.venv/Scripts/activate          # Windows (macOS/Linux: source .venv/bin/activate)
pip install -e ".[dev]"
pytest -q

asaase search floods            # list scenes, no login needed
asaase download floods --main-track-only --dates 2026-08-16 2026-09-09
asaase quicklook floods         # before/after/difference PNG in data/work/
asaase build floods             # writes web/public/data/floods/
```

Downloading needs a free [NASA Earthdata](https://urs.earthdata.nasa.gov/) account. Put your
login in `~/.netrc` (Windows: `%USERPROFILE%\_netrc`):

```
machine urs.earthdata.nasa.gov login YOUR_USERNAME password YOUR_PASSWORD
```

Never commit credentials. `.gitignore` already excludes `.netrc`, `.env` and all `.h5` files.

## How it works

1. **Search**: `asf_search` finds NISAR L2 GCOV products on the chosen track and frame
   (dual-pol HH+HV only).
2. **Read**: `h5py` reads just the study-area window from each HDF5 file.
3. **Process**: Lee speckle filter, convert to dB, resample onto one fixed lon/lat grid per
   story, so every date lines up pixel for pixel.
4. **Detect**: forest loss means HV fell by 3 dB or more since the first pass. Water means HH
   is below an Otsu threshold. Areas are computed in true ground units.
5. **Export**: transparent PNG overlays plus `story.json` (dates, image paths, time series).
   The app is fully static, so there is no server to break during the demo.

## Data and credits

- NISAR L-band products: NASA/JPL-Caltech and ISRO, distributed by the
  [ASF DAAC](https://nisar-docs.asf.alaska.edu/).
- Basemaps: Esri (Dark Gray Canvas, World Imagery).
- News and context sources are listed in each story's panel.

## Licence

MIT (see `LICENSE`).
