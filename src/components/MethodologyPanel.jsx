import { CloseIcon } from "./Icons.jsx";

export default function MethodologyPanel({ open, onClose, data }) {
  if (!open) return null;
  return (
    <div className="dialog-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="methodology-panel" role="dialog" aria-modal="true" aria-labelledby="methods-title">
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">Methods &amp; sources</p>
            <h2 id="methods-title">What the comparisons mean</h2>
          </div>
          <button className="icon-button" type="button" aria-label="Close methods" onClick={onClose}><CloseIcon /></button>
        </div>
        <div className="method-grid">
          <article>
            <h3>Your telemetry</h3>
            <p>Power, heart rate, cadence, speed, elevation, work, normalized power, and power-duration values are calculated from the six supplied Garmin FIT files.</p>
            <p>Timestamp gaps and unresolved power samples split continuity; rolling windows never cross them.</p>
          </article>
          <article>
            <h3>Camp results</h3>
            <p>Organizer PDFs define the stable camp field. A rank appears only where peer time results exist. An organizer “POSITION” percentage is retained as an undocumented source value, never converted into a rank.</p>
          </article>
          <article>
            <h3>Strava Following</h3>
            <p>This is a separate, visibility-filtered subset. It may omit private or hidden efforts, include non-camp riders, and change over time. It is never presented as the entire camp.</p>
          </article>
          <article>
            <h3>Relative to your fitness</h3>
            <p>The baseline is only this six-ride camp power-duration curve with FTP 250 W and body mass 68 kg. “Power realization” compares a segment’s average power with your best camp-week power at the same duration; it is not a diagnosis of fatigue or form.</p>
          </article>
          <article>
            <h3>HR drift</h3>
            <p>Long efforts use first-half versus second-half power-to-heart-rate decoupling. Short efforts show heart-rate rise instead because decoupling is too unstable to interpret.</p>
          </article>
          <article>
            <h3>Notable efforts</h3>
            <p>Counts use genuinely distinct, non-overlapping intervals at the selected duration and threshold. Counts across different durations overlap physiologically and must not be added together.</p>
          </article>
        </div>
        <footer className="method-footer">
          <span>Data build: {data?.meta?.generated_at ? new Date(data.meta.generated_at).toLocaleString("en-US") : "reviewed 2026-10-25"}</span>
          <span>17 posted segments · 15 ridden · 2 weather cancellations</span>
        </footer>
      </section>
    </div>
  );
}
