import { ExternalIcon } from "./Icons.jsx";
import PeerComparison from "./PeerComparison.jsx";
import PowerCurve from "./PowerCurve.jsx";
import SynchronizedTelemetryChart from "./SynchronizedTelemetryChart.jsx";
import { FTP_W, WEIGHT_KG, formatDuration, formatNumber, lookupCurvePower } from "../lib.js";
import useJsonResource from "../useJsonResource.js";

function Metric({ value, label, note }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function metricValue(value, suffix = "", digits = 0) {
  return value == null ? "—" : `${formatNumber(value, digits)}${suffix}`;
}

function PowerAnalysis({ segment, weekCurve }) {
  const metrics = segment.metrics ?? {};
  const duration = metrics.duration_seconds;
  const expectedPower = lookupCurvePower(weekCurve, duration);
  const realization = metrics.power_realization_pct ?? (
    expectedPower && metrics.average_power_w ? (metrics.average_power_w / expectedPower) * 100 : null
  );
  const rows = [
    ["Average power", metricValue(metrics.average_power_w, " W", 1)],
    ["Normalized power", metricValue(metrics.normalized_power_w, " W")],
    ["Maximum power", metricValue(metrics.max_power_w, " W")],
    ["Work", metricValue(metrics.work_kj, " kJ")],
    ["Variability index", metricValue(metrics.variability_index, "", 2)],
    ["VAM", metricValue(metrics.vam_m_per_hour, " m/h")],
    ["HR first → second half", metrics.hr_first_half_bpm == null ? "—" : `${formatNumber(metrics.hr_first_half_bpm)} → ${formatNumber(metrics.hr_second_half_bpm)} bpm`],
    [metrics.hr_drift_metric_label ?? "Power:HR decoupling", metricValue(metrics.hr_drift_value, metrics.hr_drift_unit ?? "%", 1)],
  ];
  return (
    <section className="mini-panel power-analysis-panel">
      <h3>Power &amp; heart-rate analysis</h3>
      <dl className="analysis-list">
        {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {realization != null ? (
        <div className="realization-card">
          <span>Camp-week power realization</span>
          <strong>{formatNumber(realization, 1)}%</strong>
          <small>{formatNumber(metrics.average_power_w)} W versus {formatNumber(expectedPower)} W best camp-week power at {formatDuration(duration)}.</small>
        </div>
      ) : null}
    </section>
  );
}

function CancelledSegment({ segment, ride, onOpenRide }) {
  return (
    <main className="segment-main cancelled-view">
      <div className="segment-heading">
        <div>
          <p className="eyebrow">{ride?.label ?? "Ride 1"}</p>
          <h1>{segment.camp_name}</h1>
          <p className="segment-subtitle">Planned camp-posted segment</p>
        </div>
        {segment.strava_url ? <a className="strava-link" href={segment.strava_url} target="_blank" rel="noreferrer">Open segment <ExternalIcon /></a> : null}
      </div>
      <section className="cancelled-card">
        <span className="status-pill status-cancelled">Not ridden · weather cancellation</span>
        <h2>There is no effort to analyze here.</h2>
        <p>The first-day route was rained out and replaced by the Santa Magdalena reroute. This segment stays in the 17-segment camp list so the explorer reflects what was posted, but it has no invented time, power, or ranking.</p>
        <button className="primary-button" type="button" onClick={() => onOpenRide(ride?.id)}>Analyze the complete first ride</button>
      </section>
      <section className="cancelled-detail">
        <h3>What is still available</h3>
        <p>Ride 1 has its full FIT-recorded power, heart rate, cadence, and speed traces, plus its power-duration and distinct-effort analysis.</p>
      </section>
    </main>
  );
}

export default function SegmentOverview({ segment, ride, weekCurve, onOpenRide }) {
  const telemetryResource = useJsonResource(segment?.series_file);
  if (!segment) return <main className="segment-main"><div className="chart-empty">Choose a segment.</div></main>;
  if (segment.status === "not_ridden_weather") return <CancelledSegment segment={segment} ride={ride} onOpenRide={onOpenRide} />;
  const metrics = segment.metrics ?? {};
  const avgPower = metrics.average_power_w;
  const wkg = metrics.w_per_kg ?? (avgPower == null ? null : avgPower / WEIGHT_KG);
  const pctFtp = metrics.pct_ftp ?? (avgPower == null ? null : (avgPower / FTP_W) * 100);
  const campRank = metrics.camp_rank;
  const campField = metrics.camp_field_n;
  const boundaryLabel = segment.boundary_basis === "exact_fit_timestamp" ? "Exact reviewed FIT boundary" : "FIT effort reconciled to the posted segment";

  return (
    <main className="segment-main">
      <div className="segment-heading">
        <div>
          <p className="eyebrow">{ride?.label ?? segment.stage}</p>
          <h1>{segment.camp_name}</h1>
          <p className="segment-subtitle">
            {segment.strava_title}
            {metrics.distance_km != null ? <> · {formatNumber(metrics.distance_km, 1)} km</> : null}
            {metrics.elevation_gain_m != null ? <> · +{formatNumber(metrics.elevation_gain_m)} m</> : null}
            {metrics.average_grade_pct != null ? <> · {formatNumber(metrics.average_grade_pct, 1)}%</> : null}
          </p>
        </div>
        {segment.strava_url ? <a className="strava-link" href={segment.strava_url} target="_blank" rel="noreferrer">Open segment <ExternalIcon /></a> : null}
      </div>

      <div className="metric-strip">
        <Metric value={formatDuration(metrics.duration_seconds)} label="Time" />
        <Metric value={metricValue(avgPower, " W", 1)} label="Avg power" />
        <Metric value={metricValue(wkg, " W/kg", 2)} label="Power / weight" />
        <Metric value={metricValue(pctFtp, "%", 0)} label="FTP" />
        <Metric value={metricValue(metrics.average_hr_bpm, " bpm", 0)} label="Avg HR" />
        <Metric value={campRank == null ? "—" : `${campRank}/${campField}`} label="Camp rank" note={campRank == null ? "No peer time table" : "Reported time field"} />
      </div>

      <div className="boundary-note">
        <span className="status-pill">Ridden</span>
        <span>{boundaryLabel}.</span>
        {segment.boundary_note ? <span>{segment.boundary_note}</span> : null}
      </div>

      {telemetryResource.loading ? <div className="chart-empty telemetry-loading">Loading one-second FIT telemetry…</div> : null}
      {telemetryResource.error ? <div className="chart-empty">This effort’s telemetry could not be loaded.</div> : null}
      {telemetryResource.data ? <SynchronizedTelemetryChart telemetry={telemetryResource.data} title={`${segment.camp_name} telemetry`} /> : null}

      <div className="segment-detail-grid">
        <PeerComparison segment={segment} />
        <PowerAnalysis segment={segment} weekCurve={weekCurve} />
        <PowerCurve points={segment.power_curve ?? []} title="Effort power curve" />
      </div>
      <p className="data-footnote">Charts use FIT-recorded samples. Gaps and unresolved power samples break continuity; no line or rolling window bridges them.</p>
    </main>
  );
}
