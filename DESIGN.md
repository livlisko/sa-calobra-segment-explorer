# Sa Calobra Segment Explorer — implementation specification

This application is a standalone public GitHub Pages product. It must not share
navigation, runtime, data bundles, or visual framing with the Mallorca relief
atlas.

## Accepted visual reference

`design/concept-segment-desktop.png` is the desktop visual specification. It was
generated after the exact 17-segment inventory was known and is evidence-bound:
the highlighted Sóller values and the visible Camp result rows come from the
reviewed FIT/PDF sources. Generated line shapes are compositional only; the
implementation must render decoded FIT telemetry instead.

## Product surfaces

1. **Segments** — one selected camp-posted segment at a time.
   - Left rail grouped by actual ride/day.
   - The two weather-cancelled climbs remain visible and explicitly say “Not
     ridden”. They must never display invented ride metrics.
   - The selected ridden effort gets synchronized power, heart-rate, cadence,
     and speed traces with a shared hover cursor.
   - Metrics include time, watts, W/kg, %FTP, HR, work, normalized power,
     variability index, power:HR decoupling/HR rise, VAM, elevation, gradient,
     and gap-safe best rolling power where available.
   - Peer populations are separate tabs: stable organizer PDF field and a
     current Strava Following subset. Missing live coverage is shown as missing,
     not simulated.
2. **Ride & week efforts** — full-ride power/HR/cadence/speed charts plus genuine
   distinct, non-overlapping notable-effort counts. Thresholds are editable in
   watts or %FTP and defaults are derived from this six-ride distribution.
   Counts at different durations are independent views and must not be summed.

## Evidence contract

- Rider baseline: 68 kg and FTP 250 W.
- FIT windows never cross timestamp gaps. Unresolved power samples split
  continuity.
- “Camp rank” is shown only when an organizer time result supports it.
- Organizer `POSITION` percentages remain labeled exactly as undocumented
  source percentages.
- Retired/replacement boundaries are disclosed for Sant Salvador and Honor.
- First name + last initial is the maximum public peer identity.
- Peer weight and raw FTP are not exposed.
- PDF Camp results, Strava Following, and within-rider FIT comparisons are never
  merged into one denominator.

## Visual system

- Canvas: near-black evergreen `#061b18`; panels `#0b2823` and `#10332b`.
- Primary text: `#f4f7f4`; secondary `#a8bbb5`; hairline `#294b43`.
- Signal colors: power cyan `#35bdf5`, HR coral `#ff7268`, cadence violet
  `#a889ff`, speed mint `#67e5a0`; selected/rank mint `#62efb0`.
- Typography: Inter/system sans. Numeric metrics use tabular figures.
- Surfaces use 10–14 px radii and one-pixel borders; no gradients, glass blur,
  decorative imagery, or map motif.
- Charts get dense but quiet gridlines, direct units, a shared crosshair, and
  series toggles. Hover cannot be the only way to access values.

## Responsive behavior

- Desktop (>= 1080 px): fixed 300–320 px rail and fluid analysis canvas.
- Tablet: 240 px rail, metrics wrap to three columns.
- Mobile (< 760 px): sticky compact header, segment rail becomes a dialog/drawer,
  metric cards become a two-column grid, charts retain a minimum usable plot
  height and scroll only inside wide comparison tables.
- Every control needs a visible focus state and at least 44 px tap target on
  mobile.

## Component inventory

- `AppShell`, `ViewTabs`, `SegmentRail`, `MobileSegmentPicker`
- `SegmentOverview`, `MetricStrip`, `StatusCallout`
- `SynchronizedTelemetryChart`, `SeriesToggle`, `HoverReadout`
- `PowerAnalysis`, `PowerCurve`
- `PeerComparison`, `PopulationTabs`, `AgeGroupFilter`
- `RideWeekExplorer`, `EffortThresholdControls`, `EffortCounts`
- `MethodologyPanel`, `SourceNote`, `EmptyState`

## Above-the-fold copy

- Product: “Sa Calobra Segment Explorer”
- Date: “Oct 18–23, 2026”
- Views: “Segments” and “Ride & week efforts”
- Default selection: Sóller, because it has a complete organizer comparison and
  a medium-duration trace that demonstrates the tool without implying the week
  is ranked solely by one result.

No additional marketing headline or explanatory paragraph belongs above the
first chart.
