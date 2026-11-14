# Asaase pipeline

NISAR L2 GCOV → web layers. See the root README for setup, and [docs/DATA_PLAN.md](../docs/DATA_PLAN.md)
for tracks and dates.

| Module | Job |
|---|---|
| `config.py` | Study areas, tracks, thresholds, paths |
| `search.py` | Find scenes on ASF (no login) |
| `download.py` | Download with Earthdata login, or open remotely |
| `gcov.py` | Read a lon/lat window from a GCOV HDF5 file |
| `process.py` | dB, Lee filter, Otsu water threshold, HV drop |
| `export.py` | Fixed lon/lat grid per story, PNG overlays |
| `build.py` | Full run, writing `web/public/data/<story>/story.json` |
| `quicklook.py` | Before/after/difference PNG for the go/no-go check |
