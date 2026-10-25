# Sa Calobra Segment Explorer

An interactive, source-backed analysis of six Mallorca cycling rides and the
17 segments posted by the camp. The explorer is intentionally a standalone
project: it does not share code, data, navigation, or deployment with the Sa
Calobra relief map.

**Live site:** https://livlisko.github.io/sa-calobra-segment-explorer/

## What the explorer shows

- One camp-posted segment at a time, with synchronized power, heart-rate,
  cadence, and speed traces from the rider's FIT files.
- Segment time, power, W/kg, %FTP, heart rate, normalized power, variability,
  work, VAM, and descriptive heart-rate change or power:HR decoupling.
- Organizer comparisons where the supplied PDFs contain stable segment results.
  Camp PDF results and Strava Following are separate populations and are never
  combined into one denominator.
- A dated all-time `People I'm Following` snapshot for 14 ridden segments,
  kept separate from same-day camp results because follows and visibility can
  change. Sant Salvador is omitted because Strava requires a flagged-segment
  waiver, which was not accepted.
- Full-ride telemetry for all six rides, including the weather-rerouted first
  ride.
- Editable notable-effort thresholds in watts or %FTP, with genuinely distinct
  bouts rather than counts of every overlapping rolling-window start.
- Explicit `Not ridden` states for Coll de sa Batalla and Santa Llúcia, which
  were cancelled because of weather.

## Evidence and interpretation

The rider baseline is 68 kg and FTP 250 W. The fitness comparison is limited to
the six supplied camp FIT files; it is not a historical Strava power curve.

Power windows never cross a timestamp gap or unresolved power sample. Missing
instantaneous power is reconstructed only when an exact consecutive one-second
accumulated-power delta supports it. Notable-effort defaults are 90% of the
observed six-ride best at each duration, rounded to the nearest 5 W. They are a
transparent near-best heuristic, not physiological zone boundaries.

Heart-rate rise and power:HR decoupling are descriptive. They do not, by
themselves, establish fatigue, hydration status, or a medical conclusion.

The public data contract is coordinate-free. It contains no latitude,
longitude, source FIT filename, device serial, activity ID, or file hash. Peer
names are limited to first name plus last initial. An organizer `POSITION`
percentage is retained as an undocumented source value and is never relabeled
as a rank or percentile.

The full implementation and evidence contract is documented in [DESIGN.md](./DESIGN.md).

## Run locally

Node.js 20.19+ or 22.12+ is required (the deployment workflow uses Node 22).

```bash
npm ci
npm run dev
```

The app uses only committed files under `public/data/`, so local development,
tests, and production builds do not require access to the original FIT or PDF
sources.

## Validate and build

```bash
npm run verify
```

`npm run verify` runs the public-data and source-contract tests, then creates a
production build in `dist/`. The tests check the 17-segment inventory, the two
weather cancellations, trace completeness, reproducibility of default distinct
effort counts, identity abbreviation, peer-population separation, and the rule
that undocumented organizer percentages are not promoted to ranks.

`scripts/build_public_data.py` is a provenance helper used in the private
analysis workspace to regenerate the committed public contract from audited
FIT/PDF intermediate data. It is deliberately not part of `npm run build` or
the deployment workflow; the published repository remains independently
installable, testable, and buildable.

## GitHub Pages deployment

Pushes to `main` run tests, build the Vite app, and deploy `dist/` through the
GitHub Pages Actions workflow. The workflow can also be started manually from
the Actions tab. Repository Pages settings should use **GitHub Actions** as the
source.

## Data sources

- Six rider-supplied Garmin FIT activity files, October 18–23, 2026.
- Organizer climb/result PDFs supplied for stages 2, 4, 5, and 6.
- Current Strava segment identifiers used only to link to the relevant segment.
- Authenticated Strava `People I'm Following` leaderboards captured October 25,
  2026 for 14 ridden segments. Full display names are not published.
