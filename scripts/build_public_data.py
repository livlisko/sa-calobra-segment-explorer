#!/usr/bin/env python3
"""Merge the audited FIT and PDF layers into the public explorer contract."""

from __future__ import annotations

import csv
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
WORK = PROJECT.parent
FIT_ROOT = WORK / "segment_explorer_data" / "results"
PEER_PATH = WORK / "segment_peer_data" / "segment_peer_data.json"
FOLLOWING_PATH = WORK / "strava_following" / "public_following_2026-10-25.json"
POWER_DURATION_PATH = WORK / "fit_analysis" / "results" / "power_duration.csv"
CAMP_CURVE_PATH = WORK / "fit_analysis" / "results" / "camp_power_duration.csv"
OUTPUT = PROJECT / "public" / "data"

RIDE_LABELS = {
    "ride-1": ("Ride 1 · weather reroute", "Weather reroute", "Oct 18"),
    "ride-2": ("Betlem & Sant Salvador", "Betlem + Salvador", "Oct 19"),
    "ride-3": ("Caffeine Ride", "Caffeine Ride", "Oct 20"),
    "ride-4": ("Queen Stage", "Queen Stage", "Oct 21"),
    "ride-5": ("Sa Calobra", "Sa Calobra", "Oct 22"),
    "ride-6": ("Cap de Formentor", "Formentor", "Oct 23"),
}


def read_json(path: Path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
        handle.write("\n")


def number(value):
    if value in (None, ""):
        return None
    return float(value)


def load_curves():
    ride_curves: dict[str, list[dict]] = {ride_id: [] for ride_id in RIDE_LABELS}
    with POWER_DURATION_PATH.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            ride_id = f"ride-{row['stage_candidate']}"
            if ride_id in ride_curves:
                ride_curves[ride_id].append(
                    {"duration_s": int(row["duration_seconds"]), "power_w": number(row["average_power_w"])}
                )
    with CAMP_CURVE_PATH.open(newline="", encoding="utf-8") as handle:
        week_curve = [
            {"duration_s": int(row["duration_seconds"]), "power_w": number(row["average_power_w"]), "ride_id": f"ride-{row['stage_candidate']}"}
            for row in csv.DictReader(handle)
        ]
    return ride_curves, week_curve


def copy_series(manifest: dict) -> None:
    series_output = OUTPUT / "series"
    if series_output.exists():
        shutil.rmtree(series_output)
    series_output.mkdir(parents=True)
    for descriptor in manifest["rideSeries"] + manifest["segmentSeries"]:
        source = FIT_ROOT / descriptor["file"]
        target = series_output / source.name
        write_json(target, read_json(source))


def peer_scope(peer_segment: dict, following_by_segment_id: dict) -> dict:
    camp_source = peer_segment["pdf_camp_results"]
    coverage = camp_source["coverage"]
    rows = []
    for row in camp_source["peer_rows"]:
        rows.append(
            {
                "rider_label": row["public_label"],
                "is_user": row["is_user"],
                "age_group": row["age_group"] if row["age_group_status"] == "reported" else None,
                "time_seconds": row["time_seconds"],
                "average_power_w": row["avg_power_w"],
                "pct_ftp": row["pct_ftp"],
                "rank": row["derived_time_rank"],
                "time_field_n": row["derived_time_field_size"],
                "source_place": row["source_place"],
                "source_place_kind": row["source_place_kind"],
                "position_pct": row["organizer_position_pct_undocumented"],
                "organizer_points": row["organizer_points"],
            }
        )
    notes = list(coverage["notes"])
    if not rows:
        message = notes[0] if notes else "No segment-specific peer rows are present in the supplied camp PDFs."
    elif coverage["reported_time_count"] == 0:
        message = "The supplied organizer table has no peer segment times, so these rows are not a time ranking."
    else:
        message = None
    following = following_by_segment_id.get(str(peer_segment["current_segment_id"]))
    if following is None:
        following = {
            "status": peer_segment["strava_following"]["status"],
            "field_n": None,
            "retrieved_at": peer_segment["strava_following"]["retrieved_at"],
            "scope": "All Time · People I'm Following",
            "rows": [],
            "note": peer_segment["strava_following"]["note"],
        }
    return {
        "camp": {
            "coverage_class": coverage["class"],
            "field_n": coverage["matrix_pdf_field_n"] or coverage["peer_row_count"] or None,
            "supports_age_group_filter": coverage["supports_age_group_filter"],
            "rows": rows,
            "message": message,
            "note": " ".join(notes),
            "source_file": ", ".join(coverage["source_pdf_filenames"]) or None,
        },
        "strava_following": following,
    }


def build() -> dict:
    fit = read_json(FIT_ROOT / "segment_explorer.json")
    peer = read_json(PEER_PATH)
    following = read_json(FOLLOWING_PATH) if FOLLOWING_PATH.exists() else {"segments": {}}
    following_by_segment_id = following["segments"]
    peer_by_order = {item["segment_order"]: item for item in peer["segments"]}
    ride_curves, week_curve = load_curves()
    segment_curves: dict[str, list[dict]] = {}
    for row in fit["segmentBestPowers"]:
        if row["available"]:
            segment_curves.setdefault(row["segmentId"], []).append(
                {"duration_s": row["durationSeconds"], "power_w": row["averagePowerW"]}
            )

    rides = []
    for ride in fit["rides"]:
        label, short_label, date_label = RIDE_LABELS[ride["rideId"]]
        rides.append(
            {
                "id": ride["rideId"],
                "label": label,
                "short_label": short_label,
                "date": ride["date"],
                "date_label": date_label,
                "series_file": f"series/{Path(ride['seriesFile']).name}",
                "summary": {
                    "timer_time_s": ride["timerSeconds"],
                    "elapsed_time_s": ride["elapsedSeconds"],
                    "distance_km": ride["distanceKm"],
                    "ascent_m": ride["ascentM"],
                    "average_power_w": ride["deviceAveragePowerW"],
                    "work_based_timer_average_power_w": ride["workBasedWholeTimerAveragePowerW"],
                    "normalized_power_w": ride["normalizedPowerW"],
                    "work_kj": ride["totalWorkKj"],
                    "average_hr_bpm": ride["averageHeartRateBpm"],
                    "average_cadence_rpm": ride["averageCadenceRpm"],
                    "average_speed_kph": ride["averageSpeedKph"],
                    "timestamp_gap_count": ride["positiveTimestampGapCount"],
                    "unresolved_power_sample_count": ride["unresolvedPowerSampleCount"],
                },
                "power_curve": ride_curves[ride["rideId"]],
            }
        )

    segments = []
    for index, source in enumerate(fit["segments"], start=1):
        peer_segment = peer_by_order[index]
        user_peer = next((row for row in peer_segment["pdf_camp_results"]["peer_rows"] if row["is_user"]), None)
        duration = source.get("matchedEffortElapsedSeconds")
        elevation = source.get("matchedEffortElevationGainM")
        decoupling_available = source.get("powerHrDecouplingAvailable", False)
        boundary_note = None
        if source["campName"] == "Sant Salvador":
            boundary_note = "The posted segment is retired; metrics use the current overlapping Sant Salvador boundary."
        elif source["campName"] == "Honor":
            boundary_note = "The posted segment is retired; metrics use the current overlapping honor oeste boundary."
        metrics = {}
        if source["status"] == "ridden":
            metrics = {
                "duration_seconds": duration,
                "distance_km": source.get("matchedEffortDistanceKm"),
                "elevation_gain_m": elevation,
                "average_grade_pct": source.get("matchedEffortAverageGradePct"),
                "average_power_w": source.get("matchedEffortAveragePowerW"),
                "fit_trace_average_power_w": source.get("fitTraceAveragePowerW"),
                "max_power_w": source.get("fitTraceMaxPowerW"),
                "normalized_power_w": source.get("normalizedPowerW"),
                "variability_index": source.get("variabilityIndex"),
                "work_kj": source.get("recordedWorkKj"),
                "w_per_kg": (source.get("matchedEffortAveragePowerW") or 0) / fit["athlete"]["weightKg"],
                "pct_ftp": (source.get("matchedEffortAveragePowerW") or 0) / fit["athlete"]["ftpW"] * 100,
                "average_hr_bpm": source.get("matchedEffortAverageHeartRateBpm"),
                "max_hr_bpm": source.get("maxHeartRateBpm"),
                "average_cadence_rpm": source.get("averageCadenceRpm"),
                "average_speed_kph": source.get("averageSpeedKph"),
                "vam_m_per_hour": elevation / duration * 3600 if elevation and duration else None,
                "hr_first_half_bpm": source.get("firstHalfAverageHeartRateBpm"),
                "hr_second_half_bpm": source.get("secondHalfAverageHeartRateBpm"),
                "hr_rise_bpm": source.get("heartRateChangeBpm"),
                "hr_rise_pct": source.get("heartRateChangePct"),
                "hr_drift_metric_label": "Power:HR decoupling" if decoupling_available else "HR rise (first → second half)",
                "hr_drift_value": source.get("powerHrDecouplingPct") if decoupling_available else source.get("heartRateChangeBpm"),
                "hr_drift_unit": "%" if decoupling_available else " bpm",
                "power_realization_pct": source.get("shareOfCampBestSameDurationPct"),
                "camp_best_same_duration_power_w": source.get("campBestSameDurationPowerW"),
                "camp_rank": user_peer.get("derived_time_rank") if user_peer else None,
                "camp_field_n": user_peer.get("derived_time_field_size") if user_peer else None,
            }
        segments.append(
            {
                "id": source["segmentId"],
                "order": index,
                "ride_id": source["rideId"],
                "date": source["date"],
                "stage": source["stageName"],
                "camp_name": source["campName"],
                "strava_title": peer_segment["current_title"],
                "posted_segment_id": str(peer_segment["posted_segment_id"]),
                "current_segment_id": str(peer_segment["current_segment_id"]),
                "strava_url": peer_segment["current_url"],
                "status": source["status"],
                "boundary_basis": source["boundaryBasis"],
                "boundary_confidence": source.get("boundaryConfidence"),
                "boundary_note": boundary_note,
                "series_file": f"series/{Path(source['seriesFile']).name}" if source.get("seriesFile") else None,
                "metrics": metrics,
                "power_curve": segment_curves.get(source["segmentId"], []),
                "peer": peer_scope(peer_segment, following_by_segment_id),
            }
        )

    thresholds = [
        {
            "duration_s": row["durationSeconds"],
            "camp_best_power_w": row["campBestPowerW"],
            "threshold_w": row["defaultThresholdW"],
            "threshold_pct_ftp": row["defaultThresholdPercentFtp"],
            "method": "90% of the observed six-ride best, rounded to the nearest 5 W",
        }
        for row in fit["effortThresholds"]
    ]

    candidate_files = {}
    candidate_root = FIT_ROOT / "rolling_windows"
    if candidate_root.exists():
        output_candidates = OUTPUT / "effort_candidates"
        if output_candidates.exists():
            shutil.rmtree(output_candidates)
        output_candidates.mkdir(parents=True)
        by_duration: dict[int, dict] = {}
        for source in sorted(candidate_root.glob("ride-*.json")):
            ride_windows = read_json(source)
            for duration_block in ride_windows["durations"]:
                duration = int(duration_block["durationSeconds"])
                payload = by_duration.setdefault(
                    duration,
                    {"duration_s": duration, "encoding": ride_windows["encoding"], "rides": {}},
                )
                payload["rides"][ride_windows["rideId"]] = {
                    "runs": duration_block["runs"],
                    "window_count": duration_block["windowCount"],
                }
        for duration, payload in sorted(by_duration.items()):
            filename = f"duration-{duration}.json"
            write_json(output_candidates / filename, payload)
            candidate_files[str(duration)] = f"effort_candidates/{filename}"

    return {
        "meta": {
            "title": "Sa Calobra Segment Explorer",
            "schema_version": "1.0.0",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "date_range": "2026-10-18/2026-10-23",
            "privacy": "Coordinate-free public telemetry; peers use first name and last initial only.",
        },
        "athlete": {"ftp_w": fit["athlete"]["ftpW"], "weight_kg": fit["athlete"]["weightKg"]},
        "rides": rides,
        "segments": segments,
        "week": {
            "power_curve": week_curve,
            "notable_effort_defaults": thresholds,
            "effort_candidate_files": candidate_files,
            "default_counts": fit["notableEffortCounts"],
            "default_intervals": fit["notableEffortIntervals"],
        },
        "methods": fit["methods"],
        "source_inventory": peer["source_inventory"],
    }


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = read_json(FIT_ROOT / "segment_explorer.json")
    copy_series(manifest)
    write_json(OUTPUT / "explorer.json", build())
    print(f"Wrote {OUTPUT / 'explorer.json'}")
