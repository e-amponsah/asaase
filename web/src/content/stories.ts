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
      "sees through the cloud and maps the scars: stripped river banks and mined stream " +
      "valleys, pass after pass.",
    bounds: [-2.1, 5.85, -1.7, 6.15],
    outlines: "data/galamsey/licensed.geojson",
    track: "Ascending 145 · frames 4–5",
    dates: [
      "2026-06-24", "2026-07-06", "2026-07-18", "2026-08-11", "2026-08-23",
      "2026-09-04", "2026-09-16", "2026-09-28", "2026-10-10", "2026-10-22",
    ],
    basePolLabel: "HV backscatter",
    changeLabel: "New disturbance",
    changeColor: "#f05a3c",
    footprint: { label: "Mining scars", color: "#d99a3e" },
    readingTheRadar: [
      { swatch: "#d9dedc", label: "Bright", text: "Intact forest. Leaves and branches scatter the radar back in many directions (volume scattering)." },
      { swatch: "#4a5250", label: "Dark", text: "Bare, dug-up ground or water-filled pits. Little energy comes back. Galamsey follows streams, so the scars branch like the river network." },
      { swatch: "repeating-linear-gradient(90deg, #ffffff 0 4px, transparent 4px 7px)", label: "Dashed outline", text: "Perseus Mining's licensed Edikan gold mine near Ayanfuri: industrial pits and tailings dams, not galamsey. About 6 km² of the scars fall inside it (outline: OpenStreetMap)." },
      { swatch: "#d99a3e", label: "Amber", text: "Mining scars: all land dark enough in HV to be stripped or mined on that date. Matches the brown scars in optical imagery." },
      { swatch: "#f05a3c", label: "Ember", text: "New disturbance: HV fell by 3 dB or more since the first pass, after correcting for scene-wide seasonal drift." },
    ],
    stats: [
      { value: "≈ 9,000 ha", label: "of Ghana's forest reserves destroyed by galamsey nationwide, over 5,200 ha of it since 2021 (Forestry Commission, March 2026)" },
      { value: "10", label: "dual-polarized NISAR passes, June to October 2026" },
      { value: "24 cm", label: "L-band wavelength: passes through cloud and reaches below the canopy" },
    ],
    events: [],
    places: [
      { name: "Dunkwa-on-Offin", lon: -1.78, lat: 5.96 },
      { name: "Edikan mine (licensed)", lon: -1.914, lat: 5.958, side: "left" },
    ],
    illustrativeSeries: {
      label: "Damaged land",
      unit: "km²",
      points: [
        { date: "2026-06-24", value: 38 },
        { date: "2026-07-06", value: 38.4 },
        { date: "2026-07-18", value: 38.9 },
        { date: "2026-08-11", value: 39.5 },
        { date: "2026-08-23", value: 39.8 },
        { date: "2026-09-04", value: 40.3 },
        { date: "2026-09-16", value: 40.6 },
        { date: "2026-09-28", value: 41.1 },
        { date: "2026-10-10", value: 41.4 },
        { date: "2026-10-22", value: 41.9 },
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
      "pass, cloud or no cloud, so we can watch the river swell and settle. Most of the flooding " +
      "it finds is on the lower Kulpawn and Sissili, tributaries that meet the White Volta from the west.",
    bounds: [-1.5, 9.45, -0.75, 10.7],
    focus: [-1.45, 10.12, -1.0, 10.48], // the Kulpawn–Sissili floodplain, where most flooding is
    track: "Ascending 44 · frames 6–7",
    dates: [
      "2026-06-29", "2026-07-11", "2026-07-23", "2026-08-16", "2026-08-28",
      "2026-09-09", "2026-09-21", "2026-10-03", "2026-10-15", "2026-10-27",
    ],
    basePolLabel: "HH backscatter",
    changeLabel: "Flood water",
    changeColor: "#8fb4ff",
    changeSwatch: "linear-gradient(135deg, #38aaff 50%, #b48cff 50%)",
    readingTheRadar: [
      { swatch: "#1b201f", label: "Black", text: "Open water. Smooth water reflects the radar away like a mirror, so almost nothing comes back." },
      { swatch: "#d9dedc", label: "Bright", text: "Flooded vegetation can turn bright: the pulse bounces off the water, then off stems and trunks, and straight back (double bounce). Wet soil and growing crops brighten too, so we check both radar channels." },
      { swatch: "#38aaff", label: "Blue", text: "New open water: HH darkened sharply compared with the dry, pre-spill baseline." },
      { swatch: "#b48cff", label: "Violet", text: "Flooded vegetation: HH brightened sharply and far more than HV. Growing crops or wet soil brighten both channels together, so they are left out." },
    ],
    stats: [
      { value: "28 Aug", label: "2026: SONABEL begins spilling Bagré Dam; NADMO sets up safe havens for displaced people" },
      { value: "10", label: "dual-polarized NISAR passes on one track, late June to late October" },
      { value: "12 days", label: "between repeat passes over the same ground" },
    ],
    events: [
      { date: "2026-08-28", label: "Bagré spill begins" },
      { date: "2026-09-21", label: "Flood peak" },
    ],
    places: [
      { name: "Pwalugu", lon: -0.84, lat: 10.6 },
      { name: "Daboya", lon: -1.42, lat: 9.53 },
    ],
    illustrativeSeries: {
      label: "Flooded area",
      unit: "km²",
      points: [
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
