import { useEffect, useId, useMemo, useRef, useState } from "react";
import { annotateTelemetryRuns, createTelemetryPath, formatClock, sampleSeries, valueAt } from "../lib.js";

const SERIES = {
  power: { label: "Power", shortLabel: "Power", unit: "W", color: "var(--power)", precision: 0 },
  heartRate: { label: "Heart rate", shortLabel: "HR", unit: "bpm", color: "var(--hr)", precision: 0 },
  cadence: { label: "Cadence", shortLabel: "Cadence", unit: "rpm", color: "var(--cadence)", precision: 0 },
  speed: { label: "Speed", shortLabel: "Speed", unit: "km/h", color: "var(--speed)", precision: 1 },
};

function useElementWidth(ref) {
  const [width, setWidth] = useState(900);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function niceMax(key, values) {
  const max = Math.max(...values.filter(Number.isFinite), 1);
  if (key === "power") return Math.max(200, Math.ceil(max / 100) * 100);
  if (key === "heartRate") return Math.max(180, Math.ceil(max / 20) * 20);
  if (key === "cadence") return Math.max(120, Math.ceil(max / 20) * 20);
  return Math.max(40, Math.ceil(max / 10) * 10);
}

function findNearest(samples, elapsed) {
  if (!samples.length) return null;
  let low = 0;
  let high = samples.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((valueAt(samples[middle], "elapsed") ?? 0) < elapsed) low = middle + 1;
    else high = middle;
  }
  const current = samples[low];
  const previous = samples[Math.max(0, low - 1)];
  return Math.abs((valueAt(previous, "elapsed") ?? 0) - elapsed) < Math.abs((valueAt(current, "elapsed") ?? 0) - elapsed)
    ? previous
    : current;
}

export default function SynchronizedTelemetryChart({ telemetry = [], title = "Effort telemetry", compact = false }) {
  const shellRef = useRef(null);
  const readoutId = useId();
  const width = Math.max(320, useElementWidth(shellRef));
  const [enabled, setEnabled] = useState({ power: true, heartRate: true, cadence: true, speed: true });
  const [hoverSample, setHoverSample] = useState(null);
  const [windowSeconds, setWindowSeconds] = useState(null);

  useEffect(() => {
    setHoverSample(null);
    setWindowSeconds(null);
  }, [telemetry, title]);

  const normalized = useMemo(
    () => annotateTelemetryRuns(telemetry
      .map((sample, index) => ({ ...sample, elapsed_s: valueAt(sample, "elapsed") ?? index }))
      .filter((sample) => Number.isFinite(sample.elapsed_s))
      .sort((a, b) => a.elapsed_s - b.elapsed_s)),
    [telemetry],
  );
  const totalSeconds = normalized.length ? normalized.at(-1).elapsed_s : 0;
  const isFullWindow = windowSeconds == null || windowSeconds >= totalSeconds;
  const startSeconds = 0;
  const endSeconds = isFullWindow ? totalSeconds : windowSeconds;
  const visibleSamples = useMemo(
    () => sampleSeries(normalized.filter((sample) => sample.elapsed_s >= startSeconds && sample.elapsed_s <= endSeconds), compact ? 650 : 1000),
    [normalized, startSeconds, endSeconds, compact],
  );
  const activeKeys = Object.keys(SERIES).filter((key) => enabled[key]);
  const left = width < 520 ? 52 : 72;
  const right = 18;
  const top = 14;
  const rowHeight = compact ? 66 : 78;
  const gap = 10;
  const bottom = 36;
  const plotWidth = Math.max(100, width - left - right);
  const height = top + activeKeys.length * rowHeight + Math.max(0, activeKeys.length - 1) * gap + bottom;
  const x = (elapsed) => left + ((elapsed - startSeconds) / Math.max(1, endSeconds - startSeconds)) * plotWidth;
  const expectedStep = useMemo(() => {
    if (visibleSamples.length < 2) return 1;
    const steps = visibleSamples.slice(1, 30).map((sample, index) => sample.elapsed_s - visibleSamples[index].elapsed_s).filter((step) => step > 0);
    return steps.length ? steps.sort((a, b) => a - b)[Math.floor(steps.length / 2)] : 1;
  }, [visibleSamples]);
  const activeKeySignature = activeKeys.join("|");
  const rowGeometry = useMemo(() => activeKeys.map((key, rowIndex) => {
    const series = SERIES[key];
    const rowTop = top + rowIndex * (rowHeight + gap);
    const values = visibleSamples.map((sample) => valueAt(sample, key)).filter(Number.isFinite);
    const domainMax = niceMax(key, values);
    const y = (value) => rowTop + rowHeight - (Math.max(0, value) / domainMax) * rowHeight;
    const localX = (elapsed) => left + ((elapsed - startSeconds) / Math.max(1, endSeconds - startSeconds)) * plotWidth;
    return {
      key,
      series,
      rowTop,
      domainMax,
      y,
      path: createTelemetryPath(visibleSamples, key, localX, y, expectedStep),
    };
  }), [activeKeySignature, visibleSamples, top, rowHeight, gap, left, startSeconds, endSeconds, plotWidth, expectedStep]);

  const handlePointer = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = Math.min(left + plotWidth, Math.max(left, event.clientX - bounds.left));
    const elapsed = startSeconds + ((localX - left) / plotWidth) * Math.max(1, endSeconds - startSeconds);
    setHoverSample(findNearest(visibleSamples, elapsed));
  };
  const handleChartKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || !visibleSamples.length) return;
    event.preventDefault();
    const currentElapsed = hoverSample?.elapsed_s;
    const currentIndex = currentElapsed == null
      ? 0
      : visibleSamples.findIndex((sample) => sample.elapsed_s === currentElapsed);
    if (event.key === "Home") setHoverSample(visibleSamples[0]);
    else if (event.key === "End") setHoverSample(visibleSamples.at(-1));
    else {
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = Math.min(visibleSamples.length - 1, Math.max(0, (currentIndex < 0 ? 0 : currentIndex) + direction));
      setHoverSample(visibleSamples[nextIndex]);
    }
  };

  if (!normalized.length) {
    return <div className="chart-empty">No telemetry is available for this effort.</div>;
  }

  return (
    <section className="telemetry-card" aria-label={title} ref={shellRef}>
      <div className="chart-toolbar">
        <div className="series-toggles" aria-label="Visible telemetry series">
          {Object.entries(SERIES).map(([key, series]) => (
            <label key={key}>
              <input type="checkbox" checked={enabled[key]} onChange={() => setEnabled((current) => ({ ...current, [key]: !current[key] }))} />
              <span className="toggle-mark" style={{ "--series-color": series.color }} />
              <span>{series.label}</span>
            </label>
          ))}
        </div>
        <div className="chart-window" aria-label="Chart time window">
          {[300, 600, 1200].filter((seconds) => totalSeconds > seconds).map((seconds) => (
            <button key={seconds} type="button" aria-pressed={windowSeconds === seconds} className={windowSeconds === seconds ? "is-active" : ""} onClick={() => { setWindowSeconds(seconds); setHoverSample(null); }}>
              {seconds / 60}m
            </button>
          ))}
          <button type="button" aria-pressed={isFullWindow} className={isFullWindow ? "is-active" : ""} onClick={() => { setWindowSeconds(null); setHoverSample(null); }}>Full</button>
        </div>
      </div>
      <div id={readoutId} className="hover-readout" aria-live="polite">
        <strong>{hoverSample ? formatClock(hoverSample.elapsed_s) : "Tap or hover"}</strong>
        {Object.entries(SERIES).map(([key, series]) => {
          const value = hoverSample ? valueAt(hoverSample, key) : null;
          return enabled[key] ? (
            <span key={key} style={{ "--series-color": series.color }}>
              {series.shortLabel} <b>{value == null ? "—" : value.toFixed(series.precision)} {series.unit}</b>
            </span>
          ) : null;
        })}
      </div>
      <svg
        className="telemetry-svg"
        style={{ height: `${height}px` }}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        tabIndex="0"
        aria-describedby={readoutId}
        aria-label={`${title}: ${activeKeys.map((key) => SERIES[key].label).join(", ")} over ${formatClock(endSeconds)}. Use left and right arrow keys to inspect values.`}
        onFocus={() => !hoverSample && setHoverSample(visibleSamples[0])}
        onKeyDown={handleChartKeyDown}
        onPointerDown={handlePointer}
        onPointerMove={handlePointer}
        onPointerLeave={(event) => event.pointerType === "mouse" && setHoverSample(null)}
      >
        {rowGeometry.map(({ key, series, rowTop, domainMax, y, path }) => {
          const hoverValue = hoverSample ? valueAt(hoverSample, key) : null;
          return (
            <g key={key}>
              <rect className="chart-row-bg" x={left} y={rowTop} width={plotWidth} height={rowHeight} />
              {[0, 0.5, 1].map((ratio) => (
                <g key={ratio}>
                  <line className="chart-grid" x1={left} x2={left + plotWidth} y1={rowTop + rowHeight * ratio} y2={rowTop + rowHeight * ratio} />
                  <text className="axis-value" x={left - 8} y={rowTop + rowHeight * ratio + 4} textAnchor="end">{Math.round(domainMax * (1 - ratio))}</text>
                </g>
              ))}
              <text className="axis-label" x={8} y={rowTop + rowHeight / 2 - 2}>{series.shortLabel}</text>
              <text className="axis-unit" x={8} y={rowTop + rowHeight / 2 + 14}>({series.unit})</text>
              <path d={path} fill="none" stroke={series.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              {hoverSample && hoverValue != null ? (
                <circle cx={x(hoverSample.elapsed_s)} cy={y(hoverValue)} r="4.5" fill={series.color} stroke="var(--text)" strokeWidth="1.5" />
              ) : null}
            </g>
          );
        })}
        {Array.from({ length: width < 520 ? 4 : 7 }, (_, index) => {
          const denominator = width < 520 ? 3 : 6;
          const ratio = index / denominator;
          const tickX = left + plotWidth * ratio;
          const elapsed = startSeconds + (endSeconds - startSeconds) * ratio;
          return (
            <g key={index}>
              <line className="chart-x-grid" x1={tickX} x2={tickX} y1={top} y2={height - bottom} />
              <text className="axis-time" x={tickX} y={height - 12} textAnchor={index === 0 ? "start" : index === denominator ? "end" : "middle"}>{formatClock(elapsed)}</text>
            </g>
          );
        })}
        {hoverSample ? <line className="hover-line" x1={x(hoverSample.elapsed_s)} x2={x(hoverSample.elapsed_s)} y1={top} y2={height - bottom} /> : null}
      </svg>
    </section>
  );
}
