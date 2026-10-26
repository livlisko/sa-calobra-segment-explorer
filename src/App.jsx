import { useEffect, useMemo, useState } from "react";
import AppHeader from "./components/AppHeader.jsx";
import MethodologyPanel from "./components/MethodologyPanel.jsx";
import RideWeekExplorer from "./components/RideWeekExplorer.jsx";
import SegmentOverview from "./components/SegmentOverview.jsx";
import SegmentRail from "./components/SegmentRail.jsx";
import { getInitialSegmentId, readUrlState, writeUrlState } from "./lib.js";

function LoadingState() {
  return (
    <div className="loading-state" role="status">
      <span className="loading-mark" />
      <strong>Loading the camp week…</strong>
      <p>Reading reviewed FIT telemetry and organizer results.</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="loading-state error-state" role="alert">
      <strong>The explorer data did not load.</strong>
      <p>{message}</p>
      <button className="primary-button" type="button" onClick={() => window.location.reload()}>Try again</button>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState("segments");
  const [selectedId, setSelectedId] = useState(null);
  const [rideFocus, setRideFocus] = useState(null);
  const [railOpen, setRailOpen] = useState(false);
  const [methodsOpen, setMethodsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.BASE_URL}data/explorer.json`)
      .then((response) => {
        if (!response.ok) throw new Error(`Data request returned ${response.status}.`);
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        const urlState = readUrlState(payload);
        setData(payload);
        setView(urlState.view);
        setSelectedId(urlState.segmentId ?? getInitialSegmentId(payload));
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : String(reason)));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (data && selectedId) writeUrlState(view, selectedId);
  }, [data, view, selectedId]);

  useEffect(() => {
    const drawerQuery = window.matchMedia("(max-width: 1024px)");
    const closeDrawerOutsideBreakpoint = () => {
      if (!drawerQuery.matches) setRailOpen(false);
    };
    closeDrawerOutsideBreakpoint();
    drawerQuery.addEventListener("change", closeDrawerOutsideBreakpoint);
    return () => drawerQuery.removeEventListener("change", closeDrawerOutsideBreakpoint);
  }, []);

  useEffect(() => {
    if (!railOpen && !methodsOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (methodsOpen) setMethodsOpen(false);
      else setRailOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [railOpen, methodsOpen]);

  const segment = useMemo(() => data?.segments?.find((item) => item.id === selectedId), [data, selectedId]);
  const ride = useMemo(() => data?.rides?.find((item) => item.id === segment?.ride_id), [data, segment]);
  const chooseSegment = (id) => {
    setSelectedId(id);
    setView("segments");
  };
  const openRide = (id) => {
    setRideFocus(id);
    setView("rides");
  };

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  return (
    <div className="app-shell">
      <SegmentRail data={data} selectedId={selectedId} onSelect={chooseSegment} mobileOpen={railOpen} onClose={() => setRailOpen(false)} />
      <div className="content-shell">
        <AppHeader view={view} onViewChange={setView} onOpenRail={() => setRailOpen(true)} onOpenMethodology={() => setMethodsOpen(true)} />
        {view === "segments" ? (
          <SegmentOverview segment={segment} ride={ride} weekCurve={data.week?.power_curve} onOpenRide={openRide} />
        ) : (
          <RideWeekExplorer data={data} initialRideId={rideFocus} />
        )}
        <footer className="site-footer">
          <span>FIT + organizer PDFs · reviewed 2026-10-25</span>
          <button type="button" onClick={() => setMethodsOpen(true)}>Definitions, limitations &amp; sources</button>
        </footer>
      </div>
      <MethodologyPanel open={methodsOpen} onClose={() => setMethodsOpen(false)} data={data} />
    </div>
  );
}
