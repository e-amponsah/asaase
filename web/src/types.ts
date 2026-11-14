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
  base: string;   // greyscale backscatter PNG
  change: string; // disturbance or water overlay PNG
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
  changeColor: string;
  readingTheRadar: { swatch: string; label: string; text: string }[];
  stats: Stat[];
  events: TimelineEvent[];
  places: Place[];
  illustrativeSeries: Series;
  sources: Source[];
}
