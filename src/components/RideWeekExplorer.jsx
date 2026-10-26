import { useEffect, useMemo, useState } from "react";
import { FTP_W, formatClock, formatDuration, formatNumber, selectDistinctEfforts } from "../lib.js";
import PowerCurve from "./PowerCurve.jsx";
import SynchronizedTelemetryChart from "./SynchronizedTelemetryChart.jsx";
import useJsonResource from "../useJsonResource.js";

function durationLabel(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${seconds / 60} min`;
  return `${seconds / 3600} hr`;
}

function candidatesFor(ride, duration, payload) {
  if (!ride) return [];
  if (payload?.rides?.[ride.id]) return { ...payload.rides[ride.id], duration_s: payload.duration_s ?? duration };
  if (Array.isArray(payload)) return payload.filter((item) => (item.ride_id ?? item.rideId) === ride.id);
  return ride?.effort_candidates?.[String(duration)] ?? ride?.effort_candidates?.[duration] ?? [];
}

function RideMetric({ label, value }) {
  return <div className="ride-metric"><span>{label}</span><strong>{value}</strong></div>;
}

export default function RideWeekExplorer({ data, initialRideId }) {
  const rides = data?.rides ?? [];
  const defaults = data?.week?.notable_effort_defaults ?? [];
  const [rideId, setRideId] = useState(initialRideId ?? rides[0]?.id);
  const [duration, setDuration] = useState(defaults.find((item) => Number(item.duration_s) === 300)?.duration_s ?? defaults[0]?.duration_s ?? 300);
  const [thresholdMode, setThresholdMode] = useState("watts");
  const selectedDefault = defaults.find((item) => Number(item.duration_s) === Number(duration));
  const [thresholdWatts, setThresholdWatts] = useState(selectedDefault?.threshold_w ?? 200);
  const [thresholdDraft, setThresholdDraft] = useState(null);

  useEffect(() => {
    if (initialRideId && rides.some((ride) => ride.id === initialRideId)) setRideId(initialRideId);
  }, [initialRideId, rides]);

  useEffect(() => {
    const current = defaults.find((item) => Number(item.duration_s) === Number(duration));
    if (current?.threshold_w != null) {
      setThresholdWatts(Number(current.threshold_w));
      setThresholdDraft(null);
    }
  }, [duration, defaults]);

  const ride = rides.find((item) => item.id === rideId) ?? rides[0];
  const telemetryResource = useJsonResource(ride?.series_file);
  const candidatePath = data?.week?.effort_candidate_files?.[String(duration)] ?? data?.week?.effort_candidate_files?.[duration];
  const candidateResource = useJsonResource(candidatePath);
  const effortsByRide = useMemo(
    () => rides.map((item) => ({ ride: item, efforts: selectDistinctEfforts(candidatesFor(item, duration, candidateResource.data), thresholdWatts) })),
    [rides, duration, thresholdWatts, candidateResource.data],
  );
  const selectedEfforts = effortsByRide.find((item) => item.ride.id === ride?.id)?.efforts ?? [];
  const weekCount = effortsByRide.reduce((sum, item) => sum + item.efforts.length, 0);
  const thresholdDisplay = thresholdMode === "watts" ? thresholdWatts : (thresholdWatts / FTP_W) * 100;
  const thresholdMin = thresholdMode === "watts" ? 50 : 20;
  const thresholdMax = thresholdMode === "watts" ? 800 : 300;
  const setThresholdDisplay = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    setThresholdWatts(thresholdMode === "watts" ? numeric : (numeric / 100) * FTP_W);
  };
  const updateThresholdDraft = (value) => {
    setThresholdDraft(value);
    const numeric = Number(value);
    if (value.trim() && Number.isFinite(numeric) && numeric >= thresholdMin && numeric <= thresholdMax) setThresholdDisplay(numeric);
  };
  const commitThresholdDraft = () => {
    if (thresholdDraft == null) return;
    const numeric = Number(thresholdDraft);
    if (!thresholdDraft.trim() || !Number.isFinite(numeric)) {
      setThresholdDraft(null);
      return;
    }
    setThresholdDisplay(Math.min(thresholdMax, Math.max(thresholdMin, numeric)));
    setThresholdDraft(null);
  };
  const summary = ride?.summary ?? {};

  return (
    <main className="ride-main">
      <div className="ride-view-heading">
        <div>
          <p className="eyebrow">Six FIT-recorded rides</p>
          <h1>Ride &amp; week efforts</h1>
          <p>Full-ride telemetry and genuine non-overlapping efforts—not thousands of shifted rolling starts.</p>
        </div>
        <div className="baseline-badges"><span>FTP 250 W</span><span>68 kg</span></div>
      </div>

      <div className="ride-selector" role="group" aria-label="Choose a ride">
        {rides.map((item, index) => (
          <button type="button" aria-pressed={item.id === ride?.id} className={item.id === ride?.id ? "is-active" : ""} key={item.id} onClick={() => setRideId(item.id)}>
            <span>Ride {index + 1}</span><strong>{item.short_label ?? item.label}</strong>
          </button>
        ))}
      </div>

      <section className="ride-summary-card">
        <div>
          <p className="eyebrow">{ride?.date_label}</p>
          <h2>{ride?.label}</h2>
          {ride?.id === "ride-1" ? <p className="ride-weather-note">Weather reroute · Coll de sa Batalla and Santa Llúcia were not ridden.</p> : null}
        </div>
        <div className="ride-metrics">
          <RideMetric label="Time" value={formatDuration(summary.timer_time_s, { long: true })} />
          <RideMetric label="Distance" value={summary.distance_km == null ? "—" : `${formatNumber(summary.distance_km, 1)} km`} />
          <RideMetric label="Ascent" value={summary.ascent_m == null ? "—" : `${formatNumber(summary.ascent_m)} m`} />
          <RideMetric label="Avg power" value={summary.average_power_w == null ? "—" : `${formatNumber(summary.average_power_w)} W`} />
          <RideMetric label="Normalized" value={summary.normalized_power_w == null ? "—" : `${formatNumber(summary.normalized_power_w)} W`} />
          <RideMetric label="Work" value={summary.work_kj == null ? "—" : `${formatNumber(summary.work_kj)} kJ`} />
        </div>
      </section>

      {telemetryResource.loading ? <div className="chart-empty telemetry-loading is-compact">Loading the full-ride FIT traces…</div> : null}
      {telemetryResource.error ? <div className="chart-empty">This ride’s telemetry could not be loaded.</div> : null}
      {telemetryResource.data ? <SynchronizedTelemetryChart telemetry={telemetryResource.data} title={`${ride?.label ?? "Ride"} telemetry`} compact /> : null}

      <section className="effort-explorer">
        <div className="effort-heading">
          <div>
            <p className="eyebrow">Notable efforts</p>
            <h2>{durationLabel(duration)} efforts at or above {formatNumber(thresholdWatts)} W</h2>
            <p>Each count uses distinct intervals within that duration. Change the threshold in watts or %FTP.</p>
          </div>
          <div className="threshold-controls">
            <label>
              <span>Duration</span>
              <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
                {defaults.map((item) => <option key={item.duration_s} value={item.duration_s}>{durationLabel(item.duration_s)}</option>)}
              </select>
            </label>
            <div className="threshold-input-wrap">
              <label>
                <span>Threshold</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={thresholdMin}
                  max={thresholdMax}
                  step={thresholdMode === "watts" ? 5 : 1}
                  value={thresholdDraft ?? Math.round(thresholdDisplay)}
                  aria-invalid={thresholdDraft != null && (!thresholdDraft.trim() || !Number.isFinite(Number(thresholdDraft)) || Number(thresholdDraft) < thresholdMin || Number(thresholdDraft) > thresholdMax)}
                  onChange={(event) => updateThresholdDraft(event.target.value)}
                  onBlur={commitThresholdDraft}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                    if (event.key === "Escape") setThresholdDraft(null);
                  }}
                />
              </label>
              <div className="unit-toggle" aria-label="Threshold unit">
                <button type="button" aria-pressed={thresholdMode === "watts"} className={thresholdMode === "watts" ? "is-active" : ""} onClick={() => { setThresholdDraft(null); setThresholdMode("watts"); }}>W</button>
                <button type="button" aria-pressed={thresholdMode === "pct"} className={thresholdMode === "pct" ? "is-active" : ""} onClick={() => { setThresholdDraft(null); setThresholdMode("pct"); }}>%FTP</button>
              </div>
            </div>
            <button className="reset-threshold" type="button" onClick={() => { setThresholdDraft(null); setThresholdWatts(Number(selectedDefault?.threshold_w ?? thresholdWatts)); }}>Reset default</button>
          </div>
        </div>

        {candidateResource.loading ? <p className="candidate-status">Recalculating exact gap-safe effort bouts…</p> : null}
        {candidateResource.error ? <p className="candidate-status is-error">Editable effort windows could not be loaded.</p> : null}
        <div className="week-count-banner">
          <div><span>Across the week</span><strong>{weekCount}</strong><small>distinct {durationLabel(duration)} effort{weekCount === 1 ? "" : "s"}</small></div>
          <p>Week total is valid for this one duration only. Do not add it to counts at other durations.</p>
        </div>

        <div className="ride-count-grid">
          {effortsByRide.map(({ ride: item, efforts }, index) => (
            <button type="button" key={item.id} className={item.id === ride?.id ? "is-selected" : ""} onClick={() => setRideId(item.id)}>
              <span>Ride {index + 1}</span><strong>{efforts.length}</strong><small>{item.short_label ?? item.label}</small>
            </button>
          ))}
        </div>

        <div className="effort-detail-grid">
          <section className="mini-panel effort-list-panel">
            <h3>{ride?.label}: {selectedEfforts.length} distinct effort{selectedEfforts.length === 1 ? "" : "s"}</h3>
            {selectedEfforts.length ? (
              <ol className="effort-list">
                {selectedEfforts.map((effort, index) => (
                  <li key={`${effort.start_s}-${index}`}>
                    <span>Starts {formatClock(effort.start_s)}</span>
                    <strong>{formatNumber(effort.average_power_w)} W</strong>
                    <small>{formatNumber((effort.average_power_w / FTP_W) * 100)}% FTP</small>
                  </li>
                ))}
              </ol>
            ) : <p className="mini-empty">No distinct intervals clear this threshold.</p>}
          </section>
          <PowerCurve points={ride?.power_curve ?? []} title={`${ride?.label ?? "Ride"} power curve`} />
          <PowerCurve points={data?.week?.power_curve ?? []} title="Camp-week power curve" accent="var(--speed)" />
        </div>
      </section>
      <p className="data-footnote">Editable counts are recalculated from gap-safe candidate windows. Separate duration rows describe overlapping capabilities and are not additive.</p>
    </main>
  );
}
