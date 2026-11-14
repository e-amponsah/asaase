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
| `cli.py` | The `asaase` command: `search`, `download`, `quicklook`, `build` |

Run the tests with `pytest -q` and lint with `ruff check .`.
