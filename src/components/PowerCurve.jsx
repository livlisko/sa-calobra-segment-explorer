import { useMemo, useRef } from "react";
import { formatDuration, formatNumber } from "../lib.js";

const LABEL_DURATIONS = [1, 5, 15, 30, 60, 120, 300, 600, 1200, 3600];

export default function PowerCurve({ points = [], title = "Power curve", accent = "var(--power)" }) {
  const svgRef = useRef(null);
  const normalized = useMemo(
    () => points
      .map((point) => ({ duration: Number(point.duration_s ?? point.durationSeconds), power: Number(point.power_w ?? point.power) }))
      .filter((point) => Number.isFinite(point.duration) && point.duration > 0 && Number.isFinite(point.power))
      .sort((a, b) => a.duration - b.duration),
    [points],
  );

  if (!normalized.length) return <div className="mini-empty">Power curve unavailable</div>;
  const width = 460;
  const height = 220;
  const pad = { left: 46, right: 16, top: 18, bottom: 42 };
  const minDuration = normalized[0].duration;
  const maxDuration = normalized.at(-1).duration;
  const maxPower = Math.ceil(Math.max(...normalized.map((point) => point.power)) / 100) * 100;
  const x = (duration) => pad.left + ((Math.log(duration) - Math.log(minDuration)) / Math.max(0.001, Math.log(maxDuration) - Math.log(minDuration))) * (width - pad.left - pad.right);
  const y = (power) => pad.top + (1 - power / maxPower) * (height - pad.top - pad.bottom);
  const path = normalized.map((point, index) => `${index ? "L" : "M"}${x(point.duration).toFixed(2)},${y(point.power).toFixed(2)}`).join(" ");
  const ticks = LABEL_DURATIONS.filter((duration) => duration >= minDuration && duration <= maxDuration);

  return (
    <section className="mini-panel power-curve-panel">
      <h3>{title}</h3>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} from ${formatDuration(minDuration)} to ${formatDuration(maxDuration)}`}>
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line className="chart-grid" x1={pad.left} x2={width - pad.right} y1={pad.top + ratio * (height - pad.top - pad.bottom)} y2={pad.top + ratio * (height - pad.top - pad.bottom)} />
            <text className="axis-value" x={pad.left - 7} y={pad.top + ratio * (height - pad.top - pad.bottom) + 4} textAnchor="end">{formatNumber(maxPower * (1 - ratio))}</text>
          </g>
        ))}
        {ticks.map((duration) => (
          <g key={duration}>
            <line className="chart-x-grid" x1={x(duration)} x2={x(duration)} y1={pad.top} y2={height - pad.bottom} />
            <text className="axis-time" x={x(duration)} y={height - 19} textAnchor="middle">{duration < 60 ? `${duration}s` : duration < 3600 ? `${duration / 60}m` : `${duration / 3600}h`}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke={accent} strokeWidth="3" vectorEffect="non-scaling-stroke" />
        <text className="axis-caption" x={(pad.left + width - pad.right) / 2} y={height - 2} textAnchor="middle">Duration · logarithmic scale</text>
      </svg>
    </section>
  );
}
