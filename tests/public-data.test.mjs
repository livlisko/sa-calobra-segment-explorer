import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { selectDistinctEfforts } from "../src/lib.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_ROOT = path.join(ROOT, "public", "data");
const data = JSON.parse(fs.readFileSync(path.join(DATA_ROOT, "explorer.json"), "utf8"));

function walk(value, callback, trail = []) {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, callback, [...trail, index]));
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    callback(key, child, [...trail, key]);
    walk(child, callback, [...trail, key]);
  }
}

test("public contract contains 17 posted segments, including two explicit cancellations", () => {
  assert.equal(data.rides.length, 6);
  assert.equal(data.segments.length, 17);
  assert.deepEqual(data.segments.map((segment) => segment.order), Array.from({ length: 17 }, (_, index) => index + 1));
  const cancelled = data.segments.filter((segment) => segment.status === "not_ridden_weather");
  assert.deepEqual(cancelled.map((segment) => segment.camp_name), ["Coll de sa Batalla", "Santa Llúcia"]);
  assert(cancelled.every((segment) => segment.series_file == null && Object.keys(segment.metrics).length === 0));
  assert.equal(data.segments.filter((segment) => segment.status === "ridden").length, 15);
});

test("Sóller anchor values and peer rank reproduce the reviewed evidence", () => {
  const soller = data.segments.find((segment) => segment.camp_name === "Sóller");
  assert(soller);
  assert.equal(soller.metrics.duration_seconds, 1129);
  assert.equal(soller.metrics.average_power_w, 224.8);
  assert.equal(soller.metrics.average_hr_bpm, 163.5);
  assert.equal(soller.metrics.camp_rank, 1);
  assert.equal(soller.metrics.camp_field_n, 10);
  const user = soller.peer.camp.rows.find((row) => row.is_user);
  assert.deepEqual({ label: user.rider_label, time: user.time_seconds, rank: user.rank }, { label: "Olivia L.", time: 1129, rank: 1 });
});

test("every ridden segment has trace metrics and a one-second coordinate-free series", () => {
  for (const segment of data.segments.filter((item) => item.status === "ridden")) {
    assert(segment.series_file, segment.camp_name);
    assert(Number.isFinite(segment.metrics.duration_seconds), segment.camp_name);
    assert(Number.isFinite(segment.metrics.average_power_w), segment.camp_name);
    assert(Number.isFinite(segment.metrics.average_hr_bpm), segment.camp_name);
    const series = JSON.parse(fs.readFileSync(path.join(DATA_ROOT, segment.series_file), "utf8"));
    assert.equal(series.length, segment.metrics.duration_seconds + 1, segment.camp_name);
    assert.equal(series[0].timeS, 0, segment.camp_name);
    walk(series, (key) => assert(!["latitude", "longitude", "position_lat", "position_long"].includes(key), `${segment.camp_name}: ${key}`));
  }
});

test("editable thresholds reproduce every audited default distinct-bout count", () => {
  for (const definition of data.week.notable_effort_defaults) {
    const candidatePath = data.week.effort_candidate_files[String(definition.duration_s)];
    assert(candidatePath, `duration ${definition.duration_s}`);
    const candidates = JSON.parse(fs.readFileSync(path.join(DATA_ROOT, candidatePath), "utf8"));
    let weekCount = 0;
    for (const ride of data.rides) {
      const source = { ...candidates.rides[ride.id], duration_s: candidates.duration_s };
      const actual = selectDistinctEfforts(source, definition.threshold_w).length;
      weekCount += actual;
      const expected = data.week.default_counts.find(
        (row) => row.scope === "ride" && row.rideId === ride.id && row.durationSeconds === definition.duration_s,
      );
      assert.equal(actual, expected.distinctBoutCount, `${ride.id} ${definition.duration_s}s`);
    }
    const expectedWeek = data.week.default_counts.find(
      (row) => row.scope === "week" && row.durationSeconds === definition.duration_s,
    );
    assert.equal(weekCount, expectedWeek.distinctBoutCount, `week ${definition.duration_s}s`);
  }
});

test("peer scopes stay separated and every public identifier is abbreviated", () => {
  for (const segment of data.segments) {
    assert(segment.peer.camp);
    assert(segment.peer.strava_following);
    for (const row of [...segment.peer.camp.rows, ...segment.peer.strava_following.rows]) {
      assert.match(row.rider_label, /^\p{Lu}[^ ]* \p{Lu}\.$/u, row.rider_label);
      assert(!("full_name" in row));
      assert(!("athlete_id" in row));
    }
  }
  const followingAvailable = data.segments.filter((segment) => segment.peer.strava_following.status === "available");
  assert.equal(followingAvailable.length, 14);
  assert.equal(followingAvailable.reduce((sum, segment) => sum + segment.peer.strava_following.rows.length, 0), 240);
  const albercutx = data.segments.find((segment) => segment.camp_name === "Mirador d'Albercutx");
  const userFollowing = albercutx.peer.strava_following.rows.find((row) => row.is_user);
  assert.deepEqual(
    { rank: userFollowing.rank, time: userFollowing.time_seconds, power: userFollowing.average_power_w },
    { rank: 3, time: 1379, power: 223 },
  );
  const salvador = data.segments.find((segment) => segment.camp_name === "Sant Salvador");
  assert.equal(salvador.peer.strava_following.status, "waiver_required");
  assert.equal(salvador.peer.strava_following.rows.length, 0);
});

test("organizer POSITION is never promoted to rank", () => {
  const betlem = data.segments.find((segment) => segment.camp_name === "Ermita de Betlem");
  assert(betlem.peer.camp.rows.some((row) => row.position_pct != null));
  assert(betlem.peer.camp.rows.every((row) => row.rank == null));
  assert.match(betlem.peer.camp.note, /not a rank/i);
});
