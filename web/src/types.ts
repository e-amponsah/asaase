export type StoryId = "galamsey" | "floods";
export type View = StoryId | "learn";
export type Bounds = [west: number, south: number, east: number, north: number];

export interface SeriesPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface Series {
  label: string;
  unit: string;
  points: SeriesPoint[];
}

/** One radar acquisition, as written by the pipeline (asaase build <story>). */
export interface Frame {
  date: string;
  base: string;       // greyscale backscatter PNG
  change: string;     // galamsey: new disturbance · floods: open water + flooded vegetation
  footprint?: string; // galamsey: all mining scars on that date
  coverage?: number;  // share of the study area the radar covered (0–1)
  baseline?: boolean; // floods: this pass is part of the dry baseline
  version?: string;   // NISAR processing version (CRID), e.g. P05023
  note?: string;      // data-quality note; flagged passes are left out of the chart
  stats?: Record<string, number>;
}

/** web/public/data/<story>/story.json */
export interface StoryData {
  story: StoryId;
  generated: string;
  illustrative: boolean;
  track: string;
  bounds: Bounds;
  basePolarization: string;
  frames: Frame[];
  series: Series;
  extraSeries?: Series[];
  method?: Record<string, unknown>;
}

/** A settlement near flood water (web/public/data/floods/exposure.json). */
export interface Community {
  name: string;
  lon: number;
  lat: number;
  kind: string;        // city | town | village | hamlet (OpenStreetMap)
  distanceM: number;   // distance to the nearest flood water
  people: number;      // modelled people within 1 km of the settlement point
}

export interface ExposureFrame {
  peopleInside: number;
  peopleWithin1km: number;
  communitiesWithin1km: number;
  communities: Community[];
}

/** People living in and near the detected flood water, per pass after the spill. */
export interface Exposure {
  source: string;
  bufferM: number;
  note?: string;
  frames: Record<string, ExposureFrame>;
}

/** Sentinel-1 long view (web/public/data/galamsey/longview/longview.json). */
export interface LongViewYear {
  year: number;
  image: string;
  scarKm2: number;
  coverage: number;
  scenes: number;
  from: string;
  to: string;
  offsetDb?: number;
}

export interface LongView {
  source: string;
  bounds: Bounds;
  thresholdDb: number;
  calibration: string;
  years: LongViewYear[];
}

export interface Place {
  name: string;
  lon: number;
  lat: number;
}

export interface Stat {
  value: string;
  label: string;
}

export interface TimelineEvent {
  date: string;
  label: string;
}

export interface Gap {
  from: string;
  to: string;
  label: string;
}

export interface Source {
  label: string;
  url: string;
}

/** Editorial content for a story. Lives in the app, not the pipeline. */
export interface StoryContent {
  id: StoryId;
  nav: string;
  kicker: string;
  title: string;
  lede: string;
  bounds: Bounds;
  track: string;
  dates: string[];
  basePolLabel: string;
  changeLabel: string;
  changeColor: string;  // chart colour, and the toggle swatch unless changeSwatch is set
  changeSwatch?: string;
  footprint?: { label: string; color: string };
  readingTheRadar: { swatch: string; label: string; text: string }[];
  stats: Stat[];
  events: TimelineEvent[];
  places: Place[];
  illustrativeSeries: Series;
  sources: Source[];
}
