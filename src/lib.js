export const FTP_W = 250;
export const WEIGHT_KG = 68;

export function formatDuration(totalSeconds, { long = false } = {}) {
  if (totalSeconds == null || !Number.isFinite(Number(totalSeconds))) return "—";
  const value = Math.max(0, Math.round(Number(totalSeconds)));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  if (long && hours) return `${hours}h ${minutes}m`;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatClock(totalSeconds) {
  if (totalSeconds == null || !Number.isFinite(Number(totalSeconds))) return "—";
  const value = Math.max(0, Math.round(Number(totalSeconds)));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatNumber(value, digits = 0) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function valueAt(sample, key) {
  const aliases = {
    power: ["power_w", "powerW", "power"],
    heartRate: ["heart_rate_bpm", "heartRateBpm", "heartRate", "hr"],
    cadence: ["cadence_rpm", "cadenceRpm", "cadence"],
    speed: ["speed_kph", "speedKph", "speed"],
    altitude: ["altitude_m", "altitudeM", "altitude"],
    elapsed: ["elapsed_s", "timeS", "elapsed", "time_s"],
  };
  for (const candidate of aliases[key] ?? [key]) {
    if (sample?.[candidate] != null && Number.isFinite(Number(sample[candidate]))) {
      return Number(sample[candidate]);
    }
  }
  return null;
}

export function sampleSeries(values, maxPoints = 900) {
  if (!Array.isArray(values) || values.length <= maxPoints) return values ?? [];
  const stride = Math.ceil(values.length / maxPoints);
  const sampled = [];
  for (let index = 0; index < values.length; index += stride) sampled.push(values[index]);
  if (sampled.at(-1) !== values.at(-1)) sampled.push(values.at(-1));
  return sampled;
}

const TELEMETRY_KEYS = ["power", "heartRate", "cadence", "speed"];

export function annotateTelemetryRuns(values) {
  const runCounters = Object.fromEntries(TELEMETRY_KEYS.map((key) => [key, 0]));
  const wasValid = Object.fromEntries(TELEMETRY_KEYS.map((key) => [key, false]));
  let previousContinuity = null;

  return (values ?? []).map((sample) => {
    const continuity = sample?.continuity_id ?? sample?.continuityId ?? null;
    const gapBefore = Number(sample?.gap_before_s ?? sample?.gapBeforeS ?? 0);
    const continuityChanged = previousContinuity != null && continuity != null && continuity !== previousContinuity;
    const runIds = {};

    for (const key of TELEMETRY_KEYS) {
      const valid = valueAt(sample, key) != null;
      if (!valid) {
        wasValid[key] = false;
        runIds[key] = null;
        continue;
      }
      if (!wasValid[key] || continuityChanged || gapBefore > 0) runCounters[key] += 1;
      runIds[key] = runCounters[key];
      wasValid[key] = true;
    }

    previousContinuity = continuity;
    return { ...sample, _runIds: runIds };
  });
}

export function createTelemetryPath(samples, key, x, y, expectedStep) {
  let path = "";
  let previousElapsed = null;
  let previousRunId = null;
  for (const sample of samples) {
    const elapsed = valueAt(sample, "elapsed");
    const value = valueAt(sample, key);
    if (elapsed == null || value == null) {
      previousElapsed = null;
      previousRunId = null;
      continue;
    }
    const runId = sample?._runIds?.[key] ?? null;
    const startsNew = previousElapsed == null
      || (runId != null && previousRunId != null && runId !== previousRunId)
      || elapsed - previousElapsed > expectedStep * 2.5;
    path += `${startsNew ? "M" : "L"}${x(elapsed).toFixed(2)},${y(value).toFixed(2)} `;
    previousElapsed = elapsed;
    previousRunId = runId;
  }
  return path.trim();
}

export function lookupCurvePower(curve, durationSeconds) {
  const points = (curve ?? [])
    .map((point) => ({
      duration: Number(point.duration_s ?? point.durationSeconds),
      power: Number(point.power_w ?? point.power),
    }))
    .filter((point) => Number.isFinite(point.duration) && Number.isFinite(point.power))
    .sort((a, b) => a.duration - b.duration);
  if (!points.length || !Number.isFinite(Number(durationSeconds))) return null;
  const target = Number(durationSeconds);
  if (target <= points[0].duration) return points[0].power;
  if (target >= points.at(-1).duration) return points.at(-1).power;
  const upperIndex = points.findIndex((point) => point.duration >= target);
  const lower = points[upperIndex - 1];
  const upper = points[upperIndex];
  const span = Math.log(upper.duration) - Math.log(lower.duration);
  const ratio = span ? (Math.log(target) - Math.log(lower.duration)) / span : 0;
  return lower.power + ratio * (upper.power - lower.power);
}

export function selectDistinctEfforts(candidates, thresholdWatts) {
  if (candidates?.runs) {
    const duration = Number(candidates.duration_s ?? candidates.durationSeconds);
    const selected = [];
    for (const run of candidates.runs) {
      const continuityId = run.continuity_id ?? run.continuityId ?? 0;
      const firstStart = Number(run.first_start_s ?? run.firstStartWallTimeS);
      const values = run.window_power_sums_ws ?? run.windowPowerSumsWs ?? [];
      let current = null;
      values.forEach((sum, index) => {
        if (Number(sum) < thresholdWatts * duration) return;
        const start = firstStart + index;
        const end = start + duration - 1;
        const average = Number(sum) / duration;
        if (current && start <= current.end_s + 1) {
          current.end_s = Math.max(current.end_s, end);
          current.qualifying_window_count += 1;
          if (average > current.average_power_w) {
            current.average_power_w = average;
            current.representative_start_s = start;
            current.representative_end_s = end;
          }
        } else {
          current = {
            continuity_id: continuityId,
            start_s: start,
            end_s: end,
            average_power_w: average,
            representative_start_s: start,
            representative_end_s: end,
            qualifying_window_count: 1,
          };
          selected.push(current);
        }
      });
    }
    return selected;
  }
  const eligible = (candidates ?? [])
    .filter((candidate) => Number(candidate.average_power_w ?? candidate.avg_power_w) >= thresholdWatts)
    .map((candidate) => ({
      ...candidate,
      average_power_w: Number(candidate.average_power_w ?? candidate.avg_power_w),
      start_s: Number(candidate.start_s ?? candidate.startTimeS ?? candidate.startWallTimeS),
      end_s: Number(candidate.end_s ?? candidate.endTimeS ?? candidate.endWallTimeS),
      continuity_id: candidate.continuity_id ?? candidate.continuityId ?? 0,
    }))
    .filter((candidate) =>
      [candidate.average_power_w, candidate.start_s, candidate.end_s].every(Number.isFinite),
    )
    .sort((a, b) => a.continuity_id - b.continuity_id || a.start_s - b.start_s);

  const selected = [];
  for (const candidate of eligible) {
    const current = selected.at(-1);
    if (current && current.continuity_id === candidate.continuity_id && candidate.start_s <= current.end_s + 1) {
      current.end_s = Math.max(current.end_s, candidate.end_s);
      current.qualifying_window_count += 1;
      if (candidate.average_power_w > current.average_power_w) {
        current.average_power_w = candidate.average_power_w;
        current.representative_start_s = candidate.start_s;
        current.representative_end_s = candidate.end_s;
      }
    } else {
      selected.push({
        ...candidate,
        qualifying_window_count: 1,
        representative_start_s: candidate.start_s,
        representative_end_s: candidate.end_s,
      });
    }
  }
  return selected;
}

export function getInitialSegmentId(data) {
  const soller = data?.segments?.find((segment) => segment.camp_name === "Sóller");
  return soller?.id ?? data?.segments?.find((segment) => segment.status === "ridden")?.id ?? null;
}

export function segmentHref(id) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", "segments");
  url.searchParams.set("segment", id);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function readUrlState(data) {
  const params = new URLSearchParams(window.location.search);
  const requestedView = params.get("view");
  const requestedSegment = params.get("segment");
  return {
    view: requestedView === "rides" ? "rides" : "segments",
    segmentId: data?.segments?.some((segment) => segment.id === requestedSegment)
      ? requestedSegment
      : getInitialSegmentId(data),
  };
}

export function writeUrlState(view, segmentId) {
  const url = new URL(window.location.href);
  url.searchParams.set("view", view);
  if (segmentId) url.searchParams.set("segment", segmentId);
  window.history.replaceState({}, "", url);
}
