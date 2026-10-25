export function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
  );
}

export function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.2v.2" /></svg>
  );
}

export function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M19 5l-8 8M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>
  );
}

export function ChevronIcon({ expanded = true }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={expanded ? "" : "is-collapsed"}><path d="m7 14 5-5 5 5" /></svg>
  );
}
