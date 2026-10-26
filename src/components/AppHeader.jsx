import { InfoIcon, MenuIcon } from "./Icons.jsx";

export default function AppHeader({ view, onViewChange, onOpenRail, onOpenMethodology }) {
  return (
    <header className="app-header">
      <div className="mobile-brand">
        <button className="icon-button" type="button" aria-label="Choose a segment" onClick={onOpenRail}>
          <MenuIcon />
        </button>
        <div>
          <strong>Sa Calobra Segment Explorer</strong>
          <span>Oct 18–23, 2026</span>
        </div>
      </div>
      <nav className="view-tabs" aria-label="Explorer view">
        <button type="button" aria-pressed={view === "segments"} className={view === "segments" ? "is-active" : ""} onClick={() => onViewChange("segments")}>
          Segments
        </button>
        <button type="button" aria-pressed={view === "rides"} className={view === "rides" ? "is-active" : ""} onClick={() => onViewChange("rides")}>
          Ride &amp; week efforts
        </button>
      </nav>
      <button className="method-button" type="button" aria-label="Methods and sources" onClick={onOpenMethodology}>
        <InfoIcon />
        <span>Methods &amp; sources</span>
      </button>
    </header>
  );
}
