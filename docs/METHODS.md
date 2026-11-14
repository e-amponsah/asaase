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
| **The Volta breathes** (floods) | −1.50, 9.45, −0.75, 10.70: White Volta, Pwalugu to Daboya | Ascending path 44, frames 6 + 7, HH + HV | 10: 29 Jun → 27 Oct |

- NISAR has a permanent data gap from 27 July to 10 August 2026.
- We use dual-polarized (HH + HV) passes only. The 17 June flood pass exists as HH only, so it is left out.
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
5. **Aligns** each pass to the first by phase correlation and corrects any offset of 0.3 pixels or more.
6. **Detects** change (below), cleans masks with a 3 × 3 opening and drops patches under 4 pixels.
7. **Exports** WebP backscatter images, transparent PNG overlays, a `story.json` with dates, areas and
   method settings, and a coarse per-pixel time series. The web app is fully static: no server.

Areas are computed in true ground units, allowing for pixel size changing with latitude.

### Galamsey: mining scars and new disturbance

- **Mining-scar footprint:** land whose HV is below a threshold found automatically (Otsu's method) on
  the first pass, capped at −15 dB. Intact canopy scatters strongly in HV; stripped ground and flooded
  pits do not. The cap comes from the optical check below (Otsu alone gives −14.0 dB here).
- **New disturbance:** HV fell by 3 dB or more since the first pass. Before comparing, we subtract the
  scene-wide seasonal drift, measured as the median HV change over clearly intact forest.

### Floods: change from a dry baseline

- **Baseline:** the mean of all passes before 20 August (before the spill).
- **New open water:** HH fell by 3 dB or more and is now water-dark (below −18 dB).
- **Flooded vegetation:** HH rose by 3 dB or more **and** by at least 1.5 dB more than HV. Water under
  vegetation reflects the pulse off the water and then off stems (double bounce), which boosts HH far more
  than HV. Wet soil and growing crops raise both channels together, so they are excluded.

## Results (all passes, June–October 2026)

### Floods: the spill shows up as a rise and fall

Water under vegetation (HH rising by 3 dB or more **and** by at least 1.5 dB more than HV) went from
about 1 km² before the spill to a peak of **10.7 km² on 21 September**, three weeks after the Bagré Dam
began spilling, and was gone by late October. A rise and fall timed with the spill is what we expected
of a flood.

| Pass | Phase | Flooded vegetation (km²) | New open water (km²) |
| --- | --- | --- | --- |
| 29 Jun, 11 Jul, 23 Jul, 16 Aug | dry baseline | 0.3–1.0 | 0.2–0.9 |
| 28 Aug | spill begins | 3.2 | 0.3 |
| 9 Sep | rising | 6.3 | 0.4 |
| **21 Sep** | **peak** | **10.7** | **1.3** |
| 3 Oct | receding | 7.6 | 0.8 |
| 15 Oct | receding | 1.4 | 0.5 |
| 27 Oct | back to baseline | 0.0 | 0.1 |

- Most flood water sits under vegetation along the north-western tributaries, not as open water: new
  open water never exceeds 1.3 km².
- A broader brightening along the rivers (HH alone up by 3 dB or more) keeps growing into mid-October.
  It rises in HV as well, so it fits wet soil and growing crops late in the rainy season, and we do not
  count it as flood.
- The 27 October pass was made with a newer processing version (CRID P05036) and is about 2 dB darker
  across the whole scene, so we read it as "flood gone" with some caution.

### Galamsey: a large, stable footprint

- The mining-scar footprint is **141–175 km²** on every pass (150 km² on 24 June, 141 km² on
  22 October). It follows the branching scar network visible in optical imagery along the stream valleys.
- About **4 km²** of it is one industrial site near 5.96°N, 1.92°W: an engineered tailings dam with a
  decant pond and a processing plant. That is large-scale licensed-style mining, not galamsey, and we
  will label it separately.
- Pass-to-pass swings of about ±8% track soil and canopy moisture, not mining, so we read the footprint
  rather than its small changes.
- New disturbance since the first pass grows to about **210–240 ha** by September and October, after
  correcting a seasonal drift of up to −0.65 dB.
- Most of the damage predates NISAR's first pass, so four months show the footprint far more than its
  growth. Sentinel-1 (2017–2026) is planned to show the longer spread.

### How we checked the thresholds

**Galamsey.** We overlaid the HV footprint at −15, −14 and −13 dB on satellite imagery (Esri World
Imagery) in five sample areas: the main Offin corridor, the dendritic south-west valleys, the eastern
belt, the north-west forest edge and the industrial site.

- **−15 dB** follows the tan, stripped scars visible in the imagery.
- **−14 dB** widens them by about one pixel (68 m) at the edges and adds 35–40% to the area.
- **−13 dB** adds scattered false hits in intact forest and in towns.

We use −15 dB. The footprint changes by about 30% per decibel, so the threshold matters more than any
other choice; it is fixed for all passes so that the time series stays comparable.

**Floods.** We counted flooded vegetation on a dry pass (23 July, where any hit is a false alarm) and at
the peak (21 September) for nine combinations of the HH rise (2, 3, 4 dB) and HH-over-HV margin
(1, 1.5, 2 dB).

| HH rise | Margin | Dry pass, 23 Jul (km²) | Peak, 21 Sep (km²) |
| --- | --- | --- | --- |
| 2 dB | 1.0 dB | 9.1 | 27.2 |
| 2 dB | 1.5 dB | 3.4 | 17.7 |
| **3 dB** | **1.5 dB** | **0.3** | **10.7** |
| 3 dB | 2.0 dB | 0.1 | 7.0 |
| 4 dB | 1.5 dB | 0.0 | 4.8 |

Our setting (3 dB, 1.5 dB) keeps false alarms near zero while keeping most of the signal. Every one of
the nine combinations peaks on 21 September, so the flood's timing does not depend on the thresholds;
its area does (roughly 5–18 km² for sensible settings).

### Coherence: tested, not used for detection

We also read interferometric coherence (how much the ground's radar fingerprint stays the same between
passes) from the NISAR GUNW products for all eight consecutive galamsey pairs, June to October. Only the
small study-area window of each 2 GB file is read over the network (`asaase coherence galamsey`).

- Median coherence is about 0.5 both inside the mining scars and in intact forest, and the share of
  low-coherence scar pixels rises and falls with the weather of each pair (5–14%). So at 12-day L-band
  in the rainy season, coherence cannot tell active digging from older scars.
- Places that stay incoherent on almost every pair are standing water: flooded pits and the tailings
  pond (HV about −22 dB). The HV footprint already captures them.
- The median-coherence map does show large straight-edged areas of lower coherence that look like
  forest-reserve boundaries (dense intact canopy). We will use it to check reserve outlines.

We therefore keep the HV footprint for detection and do not show coherence as a mining layer.

### Data quality

- **28 September (galamsey)** came with a geolocation error of about 80 m (3.6 pixels). The
  co-registration step realigns it, but its terrain correction was computed with the same error, so steep
  slopes still show false change. The pass stays on the map with a note and is left out of the charts.
- Every other pass on both tracks lines up within 0.05 pixels, and both frame mosaics show no seams.

## What we are checking next

- **Naming the industrial site** near 5.96°N, 1.92°W from a public source, and showing it apart from
  galamsey in the app.
- **Finer detail:** the 3 × 3 cleaning step at about 68 m pixels removes features narrower than about
  200 m, such as thin riverbank flooding.
- **Longer history:** Sentinel-1 (C-band, 2017–2026) to show how fast the mining scars spread before NISAR.
- **Context layers:** forest-reserve boundaries (WDPA), population (WorldPop) and settlements
  (OpenStreetMap), to report damage per reserve and people near flood water.

## Reproduce

```bash
cd pipeline
asaase search galamsey                       # list scenes, no login needed
asaase download galamsey --main-track-only   # needs a NASA Earthdata login in ~/.netrc
asaase quicklook galamsey --pol HV           # before / after / difference PNG
asaase build galamsey                        # writes web/public/data/galamsey/
```

Settings (areas, tracks, thresholds) are in `pipeline/asaase/config.py`.
