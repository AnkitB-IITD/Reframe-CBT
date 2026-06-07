/* ============================================================
   router.js — Minimal view router.
   Keeps a registry of named views (each an async fn returning an
   HTMLElement) and swaps them into a mount node. No history/hash —
   navigation is in-memory, which suits a wrapped native app.
   ============================================================ */

export function createRouter({ mount, onChange }) {
  const views = new Map();
  let current = null;

  function register(name, factory) { views.set(name, factory); return api; }

  async function navigate(name, params = {}) {
    const factory = views.get(name);
    if (!factory) { console.warn('No view:', name); return; }
    current = { name, params };

    const ctx = { name, params, navigate, replace };
    let node;
    try {
      node = await factory(ctx);
    } catch (err) {
      console.error('View render failed:', name, err);
      node = document.createElement('div');
      node.className = 'view';
      node.innerHTML = '<div class="empty"><p>Something went wrong loading this screen.</p></div>';
    }

    mount.replaceChildren(node);
    mount.scrollTop = 0;
    if (onChange) onChange(name, params);
    return node;
  }

  // replace = navigate without implying a nav-bar change (same surface)
  const replace = (name, params) => navigate(name, params);

  const api = { register, navigate, replace, get current() { return current; } };
  return api;
}
