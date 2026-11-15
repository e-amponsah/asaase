import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Theme } from "../lib/useTheme";
import type { StoryId } from "../types";

// The map library is large: load the globe after the page text.
const LearnGlobe = lazy(() => import("./LearnGlobe").then((m) => ({ default: m.LearnGlobe })));

/** True once the element has come near the screen, so the globe (and the map library) loads only then. */
function useNearScreen<T extends Element>() {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near || !ref.current) return;
    if (!("IntersectionObserver" in window)) { setNear(true); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) setNear(true); }, { rootMargin: "200px" });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [near]);
  return [ref, near] as const;
}

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

/** Physical drivers behind what each story shows, each tied to a number we measured. */
const DRIVERS: { story: string; title: string; items: { k: string; title: string; text: string }[] }[] = [
  {
    story: "Where the forest went",
    title: "Why the mining scars look the way they do",
    items: [
      {
        k: "−11 → −17 dB",
        title: "Stripping the canopy kills the HV echo",
        text: "Intact forest scatters the pulse back rotated (HV) from millions of leaves and branches. Clear it to bare soil and that volume echo is gone: HV drops by about 6 dB, which is why scars stand out so sharply.",
      },
      {
        k: "Follows the streams",
        title: "Gold sits in river gravels",
        text: "Galamsey works alluvial gold in stream beds and banks, so the digging follows the drainage network. That is why the scars branch like a river system and climb up the side valleys year by year.",
      },
      {
        k: "≈ 6% below −20 dB",
        title: "Abandoned pits fill with water",
        text: "In the rainy season, dug pits flood. Calm water reflects the pulse away like a mirror, so these are the darkest parts of the scars, and they stay that way pass after pass.",
      },
      {
        k: "± 0.7 dB",
        title: "Rain shifts the whole scene",
        text: "Wetter soil and canopy change the echo a little everywhere. We measure that shift on intact forest and remove it, so only real clearing counts as change.",
      },
    ],
  },
  {
    story: "The Volta breathes",
    title: "Why the flood shows up bright, not black",
    items: [
      {
        k: "HH ≫ HV",
        title: "Water hides under vegetation",
        text: "On the flat floodplains of the lower Kulpawn and Sissili, water spreads under the vegetation instead of forming open lakes. The pulse bounces off the water, then the stems, and straight back: HH brightens far more than HV.",
      },
      {
        k: "HH ≈ HV",
        title: "Wet soil and crops are not floods",
        text: "Rain-soaked fields and growing crops brighten both channels together. Requiring HH to rise at least 1.5 dB more than HV is how we tell flood water from a wet season.",
      },
      {
        k: "1 → 10.7 → 0 km²",
        title: "A flood rises and falls",
        text: "Flooded vegetation grew from about 1 km² before the Bagré spill to 10.7 km² on 21 September, three weeks after it began, and was gone by late October.",
      },
      {
        k: "Tributaries",
        title: "Where the water goes",
        text: "Most flooding sits near the Kulpawn–Sissili confluence, just upstream of the White Volta. A high main river can hold water back in its tributaries; radar alone cannot say how much came from the spill and how much from rain.",
      },
    ],
  },
];

const FACTS = [
  { k: "L-band", v: "24 cm wavelength" },
  { k: "12 days", v: "repeat pass" },
  { k: "HH + HV", v: "dual polarization" },
  { k: "Day & night", v: "through cloud and smoke" },
];

export function LearnView({ onStory, theme }: { onStory: (id: StoryId) => void; theme: Theme }) {
  const [globeRef, globeNear] = useNearScreen<HTMLElement>();
  return (
    <main className="learn">
      <section className="learn-hero">
        <div className="learn-hero-text">
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
        </div>
        <figure className="learn-hero-globe" ref={globeRef}>
          {globeNear ? (
            <Suspense fallback={<div className="learn-globe" aria-hidden="true" />}>
              <LearnGlobe theme={theme} onStory={onStory} />
            </Suspense>
          ) : (
            <div className="learn-globe" aria-hidden="true" />
          )}
          <figcaption>Our two study areas in Ghana. NISAR passes over each one every 12 days. Drag to turn the Earth.</figcaption>
        </figure>
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

      <section className="drivers" aria-labelledby="drivers-title">
        <p className="kicker">What drives the patterns</p>
        <h2 id="drivers-title" className="drivers-title">The physics behind each story, and the numbers we measured</h2>
        <div className="drivers-grid">
          {DRIVERS.map((d) => (
            <article key={d.story} className="drivers-col">
              <p className="drivers-story">{d.story}</p>
              <h3>{d.title}</h3>
              <ol>
                {d.items.map((it) => (
                  <li key={it.title}>
                    <span className="drivers-k">{it.k}</span>
                    <strong>{it.title}</strong>
                    <p>{it.text}</p>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      </section>

      <section className="learn-cta">
        <button className="cta" onClick={() => onStory("galamsey")}>
          <span className="cta-k">Story 1</span>
          <strong>Where the forest went</strong>
          <span>See how galamsey scars spread along the Offin River</span>
        </button>
        <button className="cta" onClick={() => onStory("floods")}>
          <span className="cta-k">Story 2</span>
          <strong>The Volta breathes</strong>
          <span>Watch the 2026 flood rise and fall after the Bagré spill</span>
        </button>
      </section>
    </main>
  );
}
