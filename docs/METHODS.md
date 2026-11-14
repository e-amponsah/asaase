# Data and methods

How Asaase turns NISAR radar into the maps and numbers in the app, what we have found so far, and
what we are still checking. All radar data is NISAR L-band (24 cm), Level 2 GCOV, June–October 2026.

## Why radar

From April to October, cloud covers southern Ghana for weeks at a time. That is the season when illegal
gold mining (*galamsey*) expands along rivers and when the White Volta floods. Optical satellites cannot
see the ground through cloud. NISAR's L-band radar sends its own microwave pulse, so it images through
cloud, day and night, every 12 days.

NISAR measures two polarizations, and they respond to different things:

| Channel | Sent / received | Responds most to |
| --- | --- | --- |
| **HH** | horizontal / horizontal | surface roughness and water: calm water reflects the pulse away and looks black |
| **HV** | horizontal / vertical | volume scattering in leaves and branches: drops sharply when forest is cleared |

## Study areas and data

| Story | Area (W, S, E, N) | NISAR track and frames | Passes (2026) |
| --- | --- | --- | --- |
| **Where the forest went** (galamsey) | −2.10, 5.85, −1.70, 6.15: Offin River, Upper Denkyira East | Ascending path 145, frames 4 + 5, HH + HV | 10: 24 Jun → 22 Oct |
| **The Volta breathes** (floods) | −1.50, 9.45, −0.75, 10.70: White Volta, Pwalugu to Daboya | Ascending path 44, frames 6 + 7, HH + HV | 11: 17 Jun → 27 Oct |

- NISAR has a permanent data gap from 27 July to 10 August 2026.
- Passes from 21 October onward were made with a newer processing version (CRID P05036 instead of
  P05023). Comparing passes made with the same version avoids small false shifts, so we
  prefer like-for-like pairs.
- The Bagré Dam in Burkina Faso began spilling into the White Volta around 28 August 2026.

Products are found with `asf_search` and downloaded from the
[ASF DAAC](https://nisar-docs.asf.alaska.edu/) with a free NASA Earthdata account.

## Processing

For every pass, `asaase build <story>` (in `pipeline/`):

1. **Reads** only the study-area window of each HDF5 file (gamma-naught backscatter, HH and HV).
2. **Filters speckle** with a Lee filter and converts to decibels.
3. **Resamples** onto one fixed lon/lat grid per story (EPSG:4326), so every date lines up pixel for pixel.
4. **Mosaics** the two frames of each pass, so the whole study area is covered.
5. **Detects** change (below), cleans masks with a 3 × 3 opening and drops patches under 4 pixels.
6. **Exports** transparent PNG overlays and a `story.json` with dates, areas and method settings. The web
   app is fully static: no server.

Areas are computed in true ground units, allowing for pixel size changing with latitude.

### Galamsey: mining scars and new disturbance

- **Mining-scar footprint:** land whose HV is below a threshold found automatically (Otsu's method) on
  the first pass, kept between −24 and −13 dB. Intact canopy scatters strongly in HV; stripped ground
  and flooded pits do not.
- **New disturbance:** HV fell by 3 dB or more since the first pass. Before comparing, we subtract the
  scene-wide seasonal drift, measured as the median HV change over clearly intact forest.

### Floods: change from a dry baseline

- **Baseline:** the mean of all passes before 20 August (before the spill).
- **New open water:** HH fell by 3 dB or more and is now water-dark (below −18 dB).
- **Flooded vegetation:** HH rose by 3 dB or more **and** by at least 1.5 dB more than HV. Water under
  vegetation reflects the pulse off the water and then off stems (double bounce), which boosts HH far more
  than HV. Wet soil and growing crops raise both channels together, so they are excluded.

## Results so far (first two passes per story)

**Galamsey (24 Jun vs 10 Oct).**
- The mining-scar footprint covers **205 km²** on 24 June and **218 km²** on 10 October (threshold
  HV < −14.0 dB).
- It closely follows the branching scar network visible in optical imagery along the stream valleys.
- New disturbance between the two dates is **170 ha**, after a −0.31 dB drift correction.
- Most of the damage predates NISAR's first pass, so the four-month record shows the footprint far more
  than its growth.

**Floods (16 Aug vs 9 Sep).**
- After the spill, the river corridors and nearby fields brightened strongly in HH (+3 to +6 dB over
  about 192 km²).
- HV brightened by the **same** amount (median +3.7 dB in both channels). That pattern fits wetter soil
  and vegetation at least as well as flooding under vegetation.
- So only **9.3 km²** passes the strict flooded-vegetation test, and new open water is **0.5 km²**.
- We describe the corridor as a **wetting signal** until the time series shows the rise and fall
  expected of a flood.

## What we are checking next

- **All passes:** a flood should peak around 21 September and recede through October; wetting from
  rain and crops should not.
- **Thresholds:** tuning against optical imagery and known mining sites. The 218 km² footprint is an
  upper estimate: it may include some naturally wet valley floors and one large site near 5.96°N,
  1.92°W that we have not yet identified as licensed or illegal.
- **Finer detail:** the 3 × 3 cleaning step at about 68 m pixels removes features narrower than about
  200 m, such as thin riverbank flooding.
- **Longer history:** Sentinel-1 (C-band, 2017–2026) to show how fast the mining scars spread before NISAR.
- **Context layers:** forest-reserve boundaries (WDPA), population (WorldPop) and settlements
  (OpenStreetMap), to report damage per reserve and people near flood water.
- **Coherence:** NISAR interferometric products (GUNW) to flag ground disturbed between passes.

## Reproduce

```bash
cd pipeline
asaase search galamsey                       # list scenes, no login needed
asaase download galamsey --main-track-only   # needs a NASA Earthdata login in ~/.netrc
asaase quicklook galamsey --pol HV           # before / after / difference PNG
asaase build galamsey                        # writes web/public/data/galamsey/
```

Settings (areas, tracks, thresholds) are in `pipeline/asaase/config.py`.
