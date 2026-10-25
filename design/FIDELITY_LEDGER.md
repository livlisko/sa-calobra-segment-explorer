# Visual fidelity ledger

## References and captures

- Segment-view concept: `concept-segment-desktop.png`
- Ride/week-view concept: `concept-efforts-desktop.png`
- Corrected desktop implementation: `implementation-desktop-v2.png`
- Ride/week implementation: `implementation-efforts-desktop-v3.png`
- Mobile implementation: `implementation-mobile-v1.png`
- Capture method: Codex in-app browser screenshot API against the local Vite app.
- Desktop viewport: 1536 × 1024 CSS pixels.
- Mobile viewport: 390 × 844 CSS pixels.
- Visual inspection: every final capture above was opened at original detail with the local image viewer.

## Concept-to-implementation comparison

1. **Information hierarchy:** Both concepts and the implementation lead with the selected analysis, then progressively disclose telemetry, derived metrics, and source comparisons. The real app adds a persistent two-view switch so segment and ride/week work remain one click apart.
2. **Visual language:** The implementation faithfully uses the concepts' dark evergreen canvas, mint selection state, warm white type, thin ruled cards, restrained badges, and four stable telemetry colors.
3. **Segment navigation:** The segment concept's left rail is preserved as a grouped, stage-aware selector. The implementation improves it with explicit `Not ridden` labels for the two rain cancellations and a mobile drawer.
4. **Telemetry:** The generated concepts use illustrative curves; the implementation replaces them with the audited FIT-derived power, heart-rate, cadence, and speed series. All four traces share one time axis and one hover position.
5. **Primary metrics:** The Sóller implementation retains the concept's 18:49, 224.8 W, 3.31 W/kg, 90% FTP, 164 bpm, and 1/10 field result. Ranking is only shown where the organizer source supports it.
6. **Effort counts:** The ride/week concept's 235 W five-minute threshold, weekly total of 8, and ride counts 0/3/0/2/1/2 are reproduced by the implementation's exact client-side distinct-bout calculation.
7. **Responsive behavior:** The desktop rail becomes a modal drawer at 390 px; metric tiles reflow into two columns; controls and charts remain within the viewport. Browser checks found no horizontal overflow at either tested size.
8. **Provenance and limitations:** The implementation adds visible reconciliation labels, separate Camp results and Strava Following scopes, methods/source disclosure, and caveats about six-ride fitness baselines. These were intentionally more explicit than the visual concepts.

## Above-the-fold copy diff

### Segment concept

Concept emphasis: “Segment detail”, “Queen Stage”, “Sóller”, and one-line source status.

Implementation emphasis: “Queen Stage”, “Sóller”, the exact route descriptor, the same six headline metrics, and “FIT effort reconciled to the posted segment.” The redundant “Segment detail” label was dropped because the active `Segments` tab already supplies that context.

### Ride/week concept

Concept heading: “Distinct notable efforts”.

Implementation heading: “Ride & week efforts”, with the clarifying deck “Full-ride telemetry and genuine non-overlapping efforts—not thousands of shifted rolling starts.” The specific notable-effort heading remains immediately below the full-ride trace, because the user asked to retain complete ride graphs as well as the weekly counts.

## Intentional deviations

- Actual FIT traces replace all decorative/generated curves; gaps remain visibly discontinuous rather than being joined.
- The real app exposes both views in one header and adds URL state for direct links.
- Controls use native accessible checkboxes, buttons, and selects rather than purely decorative pills.
- The camp comparison and Strava Following are separate scopes; no synthetic Following table is shown.
- Ride/week cards remain horizontally scrollable at narrower desktop widths so their labels do not collapse.
- Some supporting analysis appears below the first viewport because provenance and readable chart height were prioritized over compressing the dashboard.

## Verification verdict

The implemented explorer is a faithful production translation of both generated concepts. Deviations are evidence, accessibility, or responsive-layout improvements rather than changes to the intended visual direction.
