import { LANGUAGES, STORIES } from "../content/stories";
import type { View } from "../types";
import { Logo } from "./Logo";

const TABS: { id: View; label: string; short: string }[] = [
  { id: "galamsey", label: STORIES.galamsey.nav, short: "Forest" },
  { id: "floods", label: STORIES.floods.nav, short: "Volta floods" },
  { id: "learn", label: "How radar sees", short: "Radar 101" },
];

export function TopBar({ view, onView }: { view: View; onView: (v: View) => void }) {
  return (
    <header className="topbar">
      <div className="kente" aria-hidden="true" />
      <div className="topbar-inner">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); onView("galamsey"); }}>
          <Logo />
          <span className="brand-text">
            <span className="brand-name">Asaase</span>
            <span className="brand-sub">Ghana's surface, seen by NISAR radar</span>
          </span>
        </a>

        <nav className="tabs" aria-label="Stories">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`tab ${view === t.id ? "is-active" : ""}`}
              aria-current={view === t.id ? "page" : undefined}
              onClick={() => onView(t.id)}
            >
              <span className="tab-long">{t.label}</span>
              <span className="tab-short" aria-hidden="true">{t.short}</span>
            </button>
          ))}
        </nav>

        <label className="lang">
          <span className="sr-only">Language</span>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="none" stroke="currentColor" strokeWidth="1.8" d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-9 9h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
          </svg>
          <select defaultValue="en">
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} disabled={!l.ready}>
                {l.label}{l.ready ? "" : " (soon)"}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
