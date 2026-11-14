import type { Gap, StoryContent, StoryId } from "../types";

/** Permanent NISAR instrument gap, from the ASF NISAR Data User Guide. */
export const GAPS: Gap[] = [{ from: "2026-07-27", to: "2026-08-10", label: "NISAR data gap" }];

/** Timeline domain shared by both stories. */
export const DOMAIN: [string, string] = ["2026-06-10", "2026-11-01"];

export const STORIES: Record<StoryId, StoryContent> = {
  galamsey: {
    id: "galamsey",
    nav: "Where the forest went",
    kicker: "Galamsey · Offin River, Central & Ashanti",
    title: "Where the forest went",
    lede:
      "Illegal gold mining is cutting into Ghana's forest reserves and turning rivers brown. " +
      "In the rainy season, cloud hides it from optical satellites. NISAR's L-band radar " +
      "sees through the cloud and into the canopy, pass after pass.",
    bounds: [-2.1, 5.85, -1.7, 6.15],
    track: "Ascending 145 · frame 5",
    dates: [
      "2026-06-24", "2026-07-06", "2026-07-18", "2026-08-11", "2026-08-23",
      "2026-09-04", "2026-09-16", "2026-09-28", "2026-10-10", "2026-10-22",
    ],
    basePolLabel: "HV backscatter",
    changeLabel: "Canopy disturbance",
    changeColor: "#f05a3c",
    readingTheRadar: [
      { swatch: "#d9dedc", label: "Bright", text: "Intact forest. Leaves and branches scatter the radar back in many directions (volume scattering)." },
      { swatch: "#4a5250", label: "Dark", text: "Bare, dug-up ground or water-filled pits. Little energy comes back." },
      { swatch: "#f05a3c", label: "Ember", text: "Pixels whose HV signal fell by 3 dB or more since the first pass: likely canopy loss." },
    ],
    stats: [
      { value: "≈ 8,900 ha", label: "of forest reserve degraded by illegal mining by end-2024 (Forestry Commission)" },
      { value: "10", label: "dual-polarized NISAR passes, June to October 2026" },
      { value: "24 cm", label: "L-band wavelength: passes through cloud and reaches below the canopy" },
    ],
    events: [],
    places: [{ name: "Dunkwa-on-Offin", lon: -1.78, lat: 5.96 }],
    illustrativeSeries: {
      label: "Canopy disturbance",
      unit: "ha",
      points: [
        { date: "2026-06-24", value: 0 },
        { date: "2026-07-06", value: 34 },
        { date: "2026-07-18", value: 71 },
        { date: "2026-08-11", value: 118 },
        { date: "2026-08-23", value: 152 },
        { date: "2026-09-04", value: 189 },
        { date: "2026-09-16", value: 233 },
        { date: "2026-09-28", value: 262 },
        { date: "2026-10-10", value: 301 },
        { date: "2026-10-22", value: 342 },
      ],
    },
    sources: [
      { label: "MyJoyOnline: Forestry Commission on reserve degradation", url: "https://www.myjoyonline.com/galamsey-destroys-nearly-9000-hectares-of-ghanas-forest-reserves-forestry-commission/" },
      { label: "Africa Center: Ghana's illegal gold mining crisis", url: "https://africacenter.org/spotlight/galamsey-ghana-gold-mining-security/" },
      { label: "NISAR Data User Guide (ASF)", url: "https://nisar-docs.asf.alaska.edu/" },
    ],
  },

  floods: {
    id: "floods",
    nav: "The Volta breathes",
    kicker: "White Volta · Upper East, North East & Northern",
    title: "The Volta breathes",
    lede:
      "Each rainy season, water spilled from Burkina Faso's Bagré Dam runs down the White Volta " +
      "into northern Ghana. In 2026 the spill began in late August. Radar maps the water on every " +
      "pass, cloud or no cloud, so we can watch the river swell and settle.",
    bounds: [-1.5, 9.45, -0.75, 10.7],
    track: "Ascending 44 · frames 6–7",
    dates: [
      "2026-06-17", "2026-06-29", "2026-07-11", "2026-07-23", "2026-08-16", "2026-08-28",
      "2026-09-09", "2026-09-21", "2026-10-03", "2026-10-15", "2026-10-27",
    ],
    basePolLabel: "HH backscatter",
    changeLabel: "Open water",
    changeColor: "#38aaff",
    readingTheRadar: [
      { swatch: "#1b201f", label: "Black", text: "Open water. Smooth water reflects the radar away like a mirror, so almost nothing comes back." },
      { swatch: "#d9dedc", label: "Bright", text: "Flooded trees and buildings. The signal bounces off the water, then the trunk or wall, and straight back (double bounce)." },
      { swatch: "#38aaff", label: "Blue", text: "Pixels classified as open water on that date." },
    ],
    stats: [
      { value: "28 Aug", label: "2026: Bagré Dam spill begins, NADMO advises riverside evacuation" },
      { value: "11", label: "NISAR passes on one track, mid-June to late October" },
      { value: "12 days", label: "between repeat passes over the same ground" },
    ],
    events: [{ date: "2026-08-28", label: "Bagré spill begins" }],
    places: [
      { name: "Pwalugu", lon: -0.84, lat: 10.6 },
      { name: "Daboya", lon: -1.42, lat: 9.53 },
    ],
    illustrativeSeries: {
      label: "Open water",
      unit: "km²",
      points: [
        { date: "2026-06-17", value: 41 },
        { date: "2026-06-29", value: 44 },
        { date: "2026-07-11", value: 49 },
        { date: "2026-07-23", value: 56 },
        { date: "2026-08-16", value: 63 },
        { date: "2026-08-28", value: 97 },
        { date: "2026-09-09", value: 176 },
        { date: "2026-09-21", value: 208 },
        { date: "2026-10-03", value: 151 },
        { date: "2026-10-15", value: 109 },
        { date: "2026-10-27", value: 78 },
      ],
    },
    sources: [
      { label: "Graphic Online: Bagré Dam begins spillage", url: "https://www.graphic.com.gh/news/general-news/bagre-dam-begins-spillage-of-excess-water.html" },
      { label: "Water Resources Commission advisory", url: "https://wrc.gov.gh/public-advisory/" },
      { label: "NISAR Data User Guide (ASF)", url: "https://nisar-docs.asf.alaska.edu/" },
    ],
  },
};

export const LANGUAGES = [
  { code: "en", label: "English", ready: true },
  { code: "tw", label: "Twi", ready: false },
  { code: "ee", label: "Ewe", ready: false },
  { code: "dag", label: "Dagbani", ready: false },
];
