import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronIcon, CloseIcon } from "./Icons.jsx";

function SegmentGroup({ group, selectedId, onSelect }) {
  const [expanded, setExpanded] = useState(true);
  const segments = group.segments ?? [];
  return (
    <section className="rail-group">
      <button
        className="rail-group-heading"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span>
          <strong>{group.label}</strong>
          {group.date_label ? <small>{group.date_label}</small> : null}
        </span>
        <ChevronIcon expanded={expanded} />
      </button>
      {expanded ? (
        segments.length ? (
          <div className="rail-segments">
            {segments.map((segment) => {
              const notRidden = segment.status === "not_ridden_weather";
              return (
                <button
                  className={`rail-segment ${selectedId === segment.id ? "is-selected" : ""}`}
                  type="button"
                  key={segment.id}
                  onClick={() => onSelect(segment.id)}
                  aria-current={selectedId === segment.id ? "page" : undefined}
                >
                  <span className={`segment-radio ${notRidden ? "is-cancelled" : ""}`} aria-hidden="true" />
                  <span>
                    {segment.camp_name}
                    {notRidden ? <em>Not ridden</em> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="rail-empty">No official camp segment</p>
        )
      ) : null}
    </section>
  );
}

export default function SegmentRail({ data, selectedId, onSelect, mobileOpen, onClose }) {
  const railRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const groupedRides = useMemo(() => {
    const rides = data?.rides ?? [];
    const segments = data?.segments ?? [];
    return rides.map((ride) => ({
      ...ride,
      segments: segments.filter((segment) => segment.ride_id === ride.id),
    }));
  }, [data]);

  useEffect(() => {
    if (mobileOpen) {
      previousFocusRef.current = document.activeElement;
      const content = document.querySelector(".content-shell");
      if (content) content.inert = true;
      const containFocus = (event) => {
        if (event.key !== "Tab" || !railRef.current) return;
        const focusable = [...railRef.current.querySelectorAll('button:not([disabled]), a[href], select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
          .filter((element) => element.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener("keydown", containFocus);
      closeButtonRef.current?.focus();
      return () => {
        document.removeEventListener("keydown", containFocus);
        if (content) content.inert = false;
      };
    }
    if (previousFocusRef.current instanceof HTMLElement) previousFocusRef.current.focus();
    previousFocusRef.current = null;
    return undefined;
  }, [mobileOpen]);

  const selectAndClose = (id) => {
    onSelect(id);
    onClose?.();
  };

  return (
    <>
      {mobileOpen ? <button className="rail-scrim" type="button" aria-label="Close segment picker" onClick={onClose} /> : null}
      <aside ref={railRef} className={`segment-rail ${mobileOpen ? "is-open" : ""}`} aria-label="Camp segments" aria-modal={mobileOpen ? "true" : undefined} role={mobileOpen ? "dialog" : undefined}>
        <div className="rail-brand">
          <div>
            <strong>Sa Calobra Segment Explorer</strong>
            <span>Oct 18–23, 2026</span>
          </div>
          <button ref={closeButtonRef} className="icon-button rail-close" type="button" aria-label="Close segment picker" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <nav className="rail-scroll">
          {groupedRides.map((group) => (
            <SegmentGroup key={group.id} group={group} selectedId={selectedId} onSelect={selectAndClose} />
          ))}
        </nav>
      </aside>
    </>
  );
}
