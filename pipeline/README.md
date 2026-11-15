# Asaase pipeline

NISAR L2 GCOV → web layers. See the root README for setup and [docs/METHODS.md](../docs/METHODS.md)
for the method, tracks, dates and results.

| Module | Job |
|---|---|
| `config.py` | Study areas, tracks, thresholds, paths |
| `search.py` | Find scenes on ASF (no login) |
| `download.py` | Download with a NASA Earthdata login |
| `gcov.py` | Read a lon/lat window from a GCOV HDF5 file |
| `scene.py` | Mosaic the frames of one pass onto the story grid |
| `process.py` | dB, Lee filter, Otsu threshold, drift correction, change classes |
| `export.py` | Fixed lon/lat grid per story, PNG overlays |
| `build.py` | Full run, writing `web/public/data/<story>/story.json` |
| `quicklook.py` | Before / after / difference PNG for a pair of passes |
| `longview.py` | Sentinel-1 yearly scar layers, 2016–2026, calibrated against NISAR (Planetary Computer) |
| `validate.py` | Checks against independent data: Global Forest Watch loss (galamsey), Sentinel-1 (floods) |
| `exposure.py` | People in and within 1 km of flood water per pass (WorldPop + OpenStreetMap) |
| `coherence.py` | Read and cache interferometric coherence from GUNW pairs (remote, window only) |
| `cli.py` | The `asaase` command: `search`, `download`, `quicklook`, `coherence`, `exposure`, `longview`, `validate`, `build` |

Run the tests with `pytest -q` and lint with `ruff check .`.
