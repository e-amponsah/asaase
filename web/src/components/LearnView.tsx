import type { StoryId } from "../types";

const SCATTER = [
  {
    title: "Mirror: open water",
    tone: "Dark",
    text: "Calm water reflects the pulse away from the satellite, like a mirror. Floods show up as black.",
    art: (
      <svg viewBox="0 0 200 120" aria-hidden="true">
        <rect x="0" y="84" width="200" height="36" fill="var(--water-deep)" />
        <path d="M40 10 100 84" className="ray" />
        <path d="M100 84 160 10" className="ray ray-away" />
        <path d="M0 90q25-5 50 0t50 0 50 0 50 0" className="wave" />
      </svg>
    ),
  },
  {
    title: "Canopy: forest",
    tone: "Bright in HV",
    text: "L-band waves enter the canopy and scatter off branches in every direction. Some come back rotated (horizontal sent, vertical received). That HV signal is our forest gauge.",
    art: (
      <svg viewBox="0 0 200 120" aria-hidden="true">
        <rect x="0" y="100" width="200" height="20" fill="var(--soil)" />
        {[40, 80, 120, 160].map((x) => (
          <g key={x}>
            <rect x={x - 3} y="70" width="6" height="30" fill="var(--trunk)" />
            <circle cx={x} cy="58" r="22" fill="var(--canopy)" />
          </g>
        ))}
        <path d="M30 6 92 58" className="ray" />
        <path d="M92 58 70 10M92 58 110 8M92 58 130 14" className="ray ray-back" />
      </svg>
    ),
  },
  {
    title: "Double bounce: flooded trees and towns",
    tone: "Very bright in HH",
    text: "The pulse hits water, then a trunk or wall, and returns straight to the satellite. Flooded forest and flooded buildings light up.",
    art: (
      <svg viewBox="0 0 200 120" aria-hidden="true">
        <rect x="0" y="92" width="200" height="28" fill="var(--water-deep)" />
        <rect x="120" y="36" width="44" height="56" rx="2" fill="var(--wall)" />
        <path d="M30 8 100 92" className="ray" />
        <path d="M100 92 120 70" className="ray" />
        <path d="M120 70 50 8" className="ray ray-back" />
      </svg>
    ),
  },
];

const FACTS = [
  { k: "L-band", v: "24 cm wavelength" },
  { k: "12 days", v: "repeat pass" },
  { k: "HH + HV", v: "dual polarization" },
  { k: "Day & night", v: "through cloud and smoke" },
];

export function LearnView({ onStory }: { onStory: (id: StoryId) => void }) {
  return (
    <main className="learn">
      <section className="learn-hero">
        <p className="kicker">How radar sees</p>
        <h1>Optical satellites wait for clear skies. Radar brings its own light.</h1>
        <p className="lede">
          From April to October, much of southern Ghana sits under cloud, the very season when rivers flood and mining
          spreads. NISAR, the joint NASA and ISRO radar mission launched in 2025, sends microwave pulses that pass through
          cloud and measures what comes back. How much returns, and how its polarization changes, tells us what the ground is made of.
        </p>
        <dl className="facts">
          {FACTS.map((f) => (
            <div key={f.k}>
              <dt>{f.k}</dt>
              <dd>{f.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="scatter-grid">
        {SCATTER.map((s) => (
          <article key={s.title} className="scatter">
            <div className="scatter-art">{s.art}</div>
            <div className="scatter-body">
              <span className="badge">{s.tone}</span>
              <h2>{s.title}</h2>
              <p>{s.text}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="learn-cta">
        <button className="cta" onClick={() => onStory("galamsey")}>
          <span className="cta-k">Story 1</span>
          <strong>Where the forest went</strong>
          <span>Track canopy loss from galamsey along the Offin River</span>
        </button>
        <button className="cta" onClick={() => onStory("floods")}>
          <span className="cta-k">Story 2</span>
          <strong>The Volta breathes</strong>
          <span>Watch the 2026 Bagré spill flood the White Volta</span>
        </button>
      </section>
    </main>
  );
}
