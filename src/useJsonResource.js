import { useEffect, useState } from "react";

const cache = new Map();

export function dataUrl(path) {
  if (!path) return null;
  return `${import.meta.env.BASE_URL}data/${path.replace(/^\/+/, "")}`;
}

export default function useJsonResource(path) {
  const [state, setState] = useState(() => ({
    path,
    data: path ? cache.get(path) ?? null : null,
    loading: Boolean(path && !cache.has(path)),
    error: null,
  }));

  useEffect(() => {
    let active = true;
    if (!path) {
      setState({ path, data: null, loading: false, error: null });
      return () => { active = false; };
    }
    if (cache.has(path)) {
      setState({ path, data: cache.get(path), loading: false, error: null });
      return () => { active = false; };
    }
    setState({ path, data: null, loading: true, error: null });
    fetch(dataUrl(path))
      .then((response) => {
        if (!response.ok) throw new Error(`Series request returned ${response.status}.`);
        return response.json();
      })
      .then((payload) => {
        cache.set(path, payload);
        if (active) setState({ path, data: payload, loading: false, error: null });
      })
      .catch((error) => active && setState({ path, data: null, loading: false, error }));
    return () => { active = false; };
  }, [path]);

  if (state.path === path) return state;
  return {
    path,
    data: path ? cache.get(path) ?? null : null,
    loading: Boolean(path && !cache.has(path)),
    error: null,
  };
}
