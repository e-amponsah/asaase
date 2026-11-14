# Data plan: Galamsey + Volta floods

Checked against the ASF archive on 2026-11-14. All products are NISAR L-band, Level 2.

## Story 1 (hero): galamsey, "Where the forest went"

**Area:** Upper Denkyera East / Offin River corridor (Meretweso, Achiase, Dunkwa-on-Offin), roughly 5.85–6.15°N, 2.10–1.70°W.
Secondary area: Atewa Range forest reserve, the critical watershed (~6.22°N, 0.57°W).

| Use | Track / frame | Polarization | Dates (2026) |
|---|---|---|---|
| Main time series (galamsey) | Ascending path 145, frame 5 | HH+HV (DHDH) | Jun 24, Jul 6, Jul 18, Aug 11, Aug 23, Sep 4, Sep 16, Sep 28, Oct 10, Oct 22 |
| Cross-check view | Descending path 8, frame 86 | HH+HV | Jun 26 → Oct 24 (9 dates) |
| Atewa | Ascending path 44, frame 5 | HH+HV | Jun 17 → Oct 27 (10 dual-pol dates) |

**Signals:**
- **HV backscatter drop:** intact canopy has strong volume scattering. Cleared or mined ground loses it, which is roughly a 3–6 dB fall at L-band (to confirm on our data).
- **New dark patches in HH:** water-filled mining pits.
- **Coherence loss** (GUNW product): ground disturbed between two passes.

**Product:** a disturbance map showing first-detected date per pixel, plus hectares lost per forest reserve.

**Caveat:** four months is short. If the newly cleared area is too small to see, use Sentinel-1 (C-band, 2017–2026) for the long-term "how we got here" layer, and keep NISAR for the current state.

## Story 2: Volta floods, "The Volta breathes"

**Event:** the Bagré Dam (Burkina Faso) began spilling around 28 Aug 2026. NADMO issued evacuation advisories for White Volta communities. Sources: Graphic Online, Citi Newsroom, Water Resources Commission advisory.

| Use | Track / frame | Polarization | Dates (2026) |
|---|---|---|---|
| Upstream (Pwalugu, near the border) | Ascending path 44, frame 7 | HH+HV | Jun 17, Jun 29, Jul 11, Jul 23, Aug 16, **Aug 28**, **Sep 9**, **Sep 21**, Oct 3, Oct 15, Oct 27 |
| Downstream (Nawuni, Daboya) | Ascending path 44, frame 6 | HH+HV | same dates |
| Extra revisits | Descending path 109, frame 83/84; descending path 8, frame 83/84 | mixed (some HH-only) | fills in between |

**Phases:**
- Dry baseline: June–July.
- Gap: 27 Jul – 10 Aug, a permanent instrument gap.
- Pre-spill: 16 Aug.
- Spill and peak: 28 Aug – late September.
- Recession: October.

**Signal:** open water gives very low HH backscatter, so we threshold it per date (Otsu threshold plus a manual check). Flooded vegetation gives a *bright* double-bounce signal in HH, which is a nice "radar teaches you something" moment.

**Product:**
- flood extent per date,
- flooded area over time (chart),
- communities and population exposed (WorldPop / GHSL).

Path 44 covers both Atewa (frame 5) and the White Volta (frames 6–7) on the same pass.

## Supporting data

- Forest reserve boundaries: WDPA / Protected Planet (Ghana), with Global Forest Watch as fallback.
- Population: WorldPop 100 m.
- Settlements, roads, rivers: OpenStreetMap.
- Optical validation: Sentinel-2 (cloudy in the rainy season, so pick the clearest dates).
- Long history: Sentinel-1 GRD, via ASF.

## Access

- Search needs no login.
- Downloading needs a free NASA Earthdata account. Each teammate creates their own and stores the credentials in `~/.netrc` (never commit them).
- GCOV files are large HDF5 files, so we read only our area: `earthaccess` + `h5py`/`xarray` over HTTPS range requests, or subset first and save small cloud-optimized GeoTIFFs.

Search query (Python):

```python
import asf_search as asf
res = asf.search(platform="NISAR", processingLevel="GCOV",
                 intersectsWith="POINT(-1.95 6.05)",
                 start="2026-06-15", end="2026-10-31")
```

Filenames encode the track, so we filter on that. For example, `NISAR_L2_PR_GCOV_034_145_A_005_..._DHDH_...` means path 145, Ascending, frame 5, dual-pol.

## First go/no-go check (first few hours)

1. Download 2 galamsey dates (Jun 24 and Oct 22) and 2 flood dates (Aug 16 and Sep 9).
2. Clip to the area, convert to dB, and make side-by-side images.
3. If the galamsey change is visible, keep it as the hero. If not, swap the order: floods become the hero and galamsey gets the Sentinel-1 long view.
