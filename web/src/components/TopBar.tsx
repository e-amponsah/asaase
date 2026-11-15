import { STORIES } from "../content/stories";
import type { Theme } from "../lib/useTheme";
import type { View } from "../types";
import { Logo } from "./Logo";

const TABS: { id: View; label: string; short: string }[] = [
  { id: "galamsey", label: STORIES.galamsey.nav, short: "Galamsey" },
  { id: "floods", label: STORIES.floods.nav, short: "Floods" },
  { id: "learn", label: "How radar sees", short: "Radar 101" },
];

/** Slim app bar: brand, the three views, and where the data comes from. */
export function TopBar({ view, onView, theme, onTheme }: { view: View; onView: (v: View) => void; theme: Theme; onTheme: () => void }) {
  return (
    <header className="topbar">
      <div className="kente" aria-hidden="true" />
      <div className="topbar-inner">
        <a className="brand" href="#galamsey" aria-label="Asaase home" onClick={(e) => { e.preventDefault(); onView("galamsey"); }}>
          <Logo size={26} />
          <span className="brand-name">Asaase</span>
        </a>

        <nav className="tabs" aria-label="Views">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${view === t.id ? "is-active" : ""}`}
              aria-current={view === t.id ? "page" : undefined}
              onClick={() => onView(t.id)}
            >
              <span className="tab-long">{t.label}</span>
              <span className="tab-short">{t.short}</span>
            </button>
          ))}
        </nav>

        <div className="topbar-end">
          <a className="data-credit" href="https://nisar.jpl.nasa.gov/" target="_blank" rel="noreferrer"
             title="Radar data: NASA-ISRO NISAR, via NASA's Alaska Satellite Facility">
            <span className="data-dot" aria-hidden="true" />
            NASA-ISRO NISAR data
          </a>
          <button className="icon-btn theme-toggle" onClick={onTheme}
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                  title={theme === "dark" ? "Light mode" : "Dark mode"}>
            {theme === "dark" ? (
              <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
