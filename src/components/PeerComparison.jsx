import { useMemo, useState } from "react";
import { formatDuration, formatNumber } from "../lib.js";

function CoverageMessage({ population, segment }) {
  if (population === "following") {
    return (
      <div className="comparison-empty">
        <strong>Strava Following coverage is unavailable for this segment.</strong>
        <p>{segment?.peer?.strava_following?.note ?? "This remains a separate live subset—not a camp rank—because visibility and following relationships can change."}</p>
      </div>
    );
  }
  const message = segment?.peer?.camp?.message ?? "The organizer PDFs do not contain peer time results for this segment.";
  return (
    <div className="comparison-empty">
      <strong>No comparable camp time table</strong>
      <p>{message}</p>
    </div>
  );
}

export default function PeerComparison({ segment }) {
  const [population, setPopulation] = useState("camp");
  const [ageGroup, setAgeGroup] = useState("all");
  const camp = segment?.peer?.camp ?? {};
  const following = segment?.peer?.strava_following ?? {};
  const source = population === "camp" ? camp : following;
  const rows = source.rows ?? [];
  const ageGroups = useMemo(() => [...new Set(rows.map((row) => row.age_group).filter(Boolean))].sort(), [rows]);
  const filteredRows = ageGroup === "all" ? rows : rows.filter((row) => row.age_group === ageGroup);
  const hasRank = filteredRows.some((row) => row.rank != null);
  const hasSourcePlace = !hasRank && filteredRows.some((row) => row.source_place != null);

  return (
    <section className="mini-panel comparison-panel">
      <div className="panel-title-row">
        <div>
          <h3>Compare with riders</h3>
          <p>{population === "camp" ? "Organizer result sheet" : "Current visibility-filtered subset"}</p>
        </div>
        {ageGroups.length > 1 ? (
          <label className="select-label">
            <span>Age group</span>
            <select value={ageGroup} onChange={(event) => setAgeGroup(event.target.value)}>
              <option value="all">Entire reported field</option>
              {ageGroups.map((group) => <option key={group} value={group}>{group}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      <div className="population-tabs" role="tablist" aria-label="Comparison population">
        <button type="button" role="tab" aria-selected={population === "camp"} className={population === "camp" ? "is-active" : ""} onClick={() => setPopulation("camp")}>
          Camp results {camp.field_n ? <span>{camp.field_n}</span> : null}
        </button>
        <button type="button" role="tab" aria-selected={population === "following"} className={population === "following" ? "is-active" : ""} onClick={() => setPopulation("following")}>
          Strava Following {following.field_n ? <span>{following.field_n}</span> : null}
        </button>
      </div>
      {filteredRows.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {hasRank ? <th scope="col">Rank</th> : null}
                {hasSourcePlace ? <th scope="col">Source place</th> : null}
                <th scope="col">Rider</th>
                {filteredRows.some((row) => row.date_label) ? <th scope="col">Date</th> : null}
                {filteredRows.some((row) => row.time_seconds != null) ? <th scope="col">Time</th> : null}
                {filteredRows.some((row) => row.average_power_w != null) ? <th scope="col">Avg power</th> : null}
                {filteredRows.some((row) => row.average_hr_bpm != null) ? <th scope="col">HR</th> : null}
                {filteredRows.some((row) => row.vam_m_per_hour != null) ? <th scope="col">VAM</th> : null}
                {filteredRows.some((row) => row.pct_ftp != null) ? <th scope="col">%FTP</th> : null}
                {filteredRows.some((row) => row.position_pct != null) ? <th scope="col">Source “POSITION”</th> : null}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={`${row.rider_label}-${index}`} className={row.is_user ? "is-user" : ""}>
                  {hasRank ? <td>{row.rank ?? "—"}</td> : null}
                  {hasSourcePlace ? <td>{row.source_place ?? "—"}</td> : null}
                  <th scope="row">{row.rider_label}{row.is_user ? <span className="you-tag">You</span> : null}</th>
                  {filteredRows.some((item) => item.date_label) ? <td>{row.date_label ?? "—"}</td> : null}
                  {filteredRows.some((item) => item.time_seconds != null) ? <td>{formatDuration(row.time_seconds)}</td> : null}
                  {filteredRows.some((item) => item.average_power_w != null) ? <td>{row.average_power_w == null ? "—" : `${formatNumber(row.average_power_w)} W`}</td> : null}
                  {filteredRows.some((item) => item.average_hr_bpm != null) ? <td>{row.average_hr_bpm == null ? "—" : `${formatNumber(row.average_hr_bpm)} bpm`}</td> : null}
                  {filteredRows.some((item) => item.vam_m_per_hour != null) ? <td>{row.vam_m_per_hour == null ? "—" : `${formatNumber(row.vam_m_per_hour)} m/h`}</td> : null}
                  {filteredRows.some((item) => item.pct_ftp != null) ? <td>{row.pct_ftp == null ? "—" : `${formatNumber(row.pct_ftp)}%`}</td> : null}
                  {filteredRows.some((item) => item.position_pct != null) ? <td>{row.position_pct == null ? "—" : `${formatNumber(row.position_pct, 1)}%`}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <CoverageMessage population={population} segment={segment} />}
      {source.note ? <p className="source-note">{source.note}</p> : null}
      {source.source_file ? <p className="source-note">Source: {source.source_file}</p> : null}
    </section>
  );
}
