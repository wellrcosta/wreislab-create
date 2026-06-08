(async () => {
  try {
    const res = await fetch('/api/config');
    if (res.ok) window.__env__ = await res.json();
  } catch {
    // Dev fallback: window.__env__ stays undefined, env.ts falls back to import.meta.env
  }
  await import('./bootstrap');
})();
