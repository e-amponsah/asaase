# Asaase task board

How to use this board:

- Claim a task by putting your name in **Owner** and opening a branch named `<id>-short-name`
  (e.g. `d2-go-no-go`).
- Move the status as you go: `todo` → `doing` → `review` (PR open) → `done`.
- Agree any change of scope in the team chat first, then update this file in the same PR.

**Size:** S = under 2 h, M = half a day, L = a day or more.
**★** = must-have for the demo. Everything else is polish.

## Team

| Name | Strengths | Workstream lead |
|---|---|---|
| _TBD_ | | Data & radar |
| _TBD_ | | Web app |
| _TBD_ | | Story, design & pitch |
| _TBD_ | | |

## Milestones

1. **Go/no-go:** real radar quicklooks for both stories (D2). This decides the hero story.
2. **First real map:** both stories built from real NISAR data and visible in the app (D6).
3. **Feature complete:** reserves, exposure, alert card, at least one local language.
4. **Submission:** deployed site, pitch video, project page.

---

## A. Data and radar (`pipeline/`)

| ID | Task | Owner | Size | Status | Depends on | Done when |
|---|---|---|---|---|---|---|
| D1 ★ | Everyone on the data team creates a NASA Earthdata account and sets up `~/.netrc` | | S | todo | none | `asaase download` works on your machine |
| D2 ★ | **Go/no-go:** download galamsey 2026-06-24 + 2026-10-22 and floods 2026-08-16 + 2026-09-09; run `asaase quicklook` for both | | M | todo | D1 | Quicklook PNGs shared in team chat; hero story confirmed |
| D3 ★ | Tune thresholds (HV drop for forest loss, water threshold) by eye against optical imagery and known pit locations | | M | todo | D2 | Thresholds in `config.py` with a one-line justification each |
| D4 ★ | Floods: mosaic frames 6 and 7 of track A44, which together cover the study area (`build.py` uses only frame 7 today) | | M | todo | D2 | Flood layer covers Pwalugu down to Daboya with no gap |
| D5 | Galamsey: coherence-loss layer from GUNW products (ground disturbed between passes) | | L | todo | D2 | Extra overlay and toggle in the app |
| D6 ★ | Run `asaase build` for both stories and commit `web/public/data/` (keep it under ~15 MB) | | S | todo | D3, D4 | App shows real layers; "Illustrative" badge gone |
| D7 | Forest reserve boundaries (WDPA / Protected Planet) as GeoJSON, with hectares disturbed per reserve | | M | todo | D6 | `web/public/data/galamsey/reserves.geojson` with stats |
| D8 | Flood exposure: WorldPop population inside each date's flood extent, plus affected communities (OSM) | | M | todo | D6 | Exposure numbers in `story.json` |
| D9 | Fallback only if D2 shows weak galamsey change: Sentinel-1 long view (2017–2026) for the same area | | L | todo | D2 | Long-term layer and chart |

## B. Web app (`web/`)

| ID | Task | Owner | Size | Status | Depends on | Done when |
|---|---|---|---|---|---|---|
| W1 | Draw forest reserves and affected communities on the map, with a popup showing hectares or people | | M | todo | D7, D8 | Click a reserve to see its stats |
| W2 | Click anywhere to see that spot's backscatter history (export a coarse per-pixel time-series grid) | | L | todo | D6 | Chart shows the clicked pixel's history |
| W3 | Optical comparison toggle (a clear-day Sentinel-2 image), to show why radar is needed under cloud | | M | todo | none | Toggle in the basemap control |
| W4 | Alert card: a one-page summary per story and date (area, change, map snapshot), shareable on WhatsApp | | M | todo | D6 | "Share" button produces an image and link |
| W5 | Local languages: wire up i18n and add Twi, Ewe and Dagbani text for story panels (needs native speakers) | | M | todo | none | Language picker switches the text |
| W6 | Audio narration per story (English plus at least one local language) | | M | todo | W5 | Play button in the story panel |
| W7 ★ | Quality pass: Lighthouse ≥ 90, keyboard navigation, mobile check, low-bandwidth test | | S | todo | D6 | Scores recorded in the PR |
| W8 ★ | Deploy: enable GitHub Pages (workflow already in `.github/workflows/deploy.yml`) | | S | todo | none | Public URL in README |

## C. Story, validation and pitch

| ID | Task | Owner | Size | Status | Depends on | Done when |
|---|---|---|---|---|---|---|
| S1 ★ | Double-check every fact and source in `web/src/content/stories.ts` (Bagré dates, Forestry Commission figures) | | S | todo | none | Each figure has a working link |
| S2 ★ | Validate results: compare our detected pits and flood extent with optical imagery and news photos; write "how we know" notes | | M | todo | D6 | Short validation section in README |
| S3 ★ | Physical drivers write-up: why HV drops, why water is dark, what drives the patterns (the brief asks for this) | | S | todo | D2 | Text added to the explainer and the pitch |
| S4 ★ | Pitch video: script, screen recording, voice-over and edit, within the time limit | | L | todo | D6 | Video uploaded |
| S5 ★ | Space Apps project page and submission text | | S | todo | S4 | Submitted |
| S6 | Slide deck for judging | | M | todo | D6 | Deck shared |

---

## Decisions log

| Date | Decision |
|---|---|
| 2026-11-14 | Name: **Asaase**. Stories: galamsey (hero) plus Volta floods. |
| 2026-11-14 | Static web app (React + MapLibre), Python pipeline, data precomputed: no backend. |
| 2026-11-14 | NISAR window: June–October 2026 PROVISIONAL products; 27 Jul – 10 Aug is a permanent data gap. |
