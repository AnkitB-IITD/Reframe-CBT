/* ============================================================
   ui.js — DOM helpers, icons, toasts, modals, haptics, sharing.
   No framework; just small primitives the views compose.
   ============================================================ */

/* ---------- escaping & formatting ---------- */
export function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, Number(n) || 0)); }

export function fmtDate(iso, opts) {
  try {
    return new Date(iso).toLocaleDateString(undefined,
      opts || { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

export function fmtDateTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined,
      { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
}

export function relativeDay(iso) {
  const d = new Date(iso); const now = new Date();
  const days = Math.round((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return `${days} days ago`;
  return fmtDate(iso);
}

/** Local datetime in the format a <input type="datetime-local"> expects. */
export function localDatetimeValue(d = new Date()) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

/* ---------- DOM building ---------- */
/** Build an element from an HTML string (single root). */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function on(el, evt, sel, handler) {
  // delegated when sel is a string, direct otherwise
  if (typeof sel === 'function') { el.addEventListener(evt, sel); return; }
  el.addEventListener(evt, (e) => {
    const target = e.target.closest(sel);
    if (target && el.contains(target)) handler(e, target);
  });
}

/* ---------- icons (stroke, 24x24) ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  insights: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16l3-4 3 2 4-6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M5 5l4.5 4.5M14.5 14.5 19 19M19 5l-4.5 4.5M9.5 14.5 5 19"/>',
  moon: '<path d="M21 12.8A8 8 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8z"/>',
  sun: '<circle cx="12" cy="12" r="4.5"/><path d="M12 1v3M12 20v3M4.2 4.2l2 2M17.8 17.8l2 2M1 12h3M20 12h3M4.2 19.8l2-2M17.8 6.2l2-2"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M9 7V4h6v3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  bubble: '<path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.7L3 21l1.9-5.8A8.5 8.5 0 1 1 21 11.5z"/>',
  scales: '<path d="M12 3v18"/><path d="M7 21h10"/><path d="M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0z"/><path d="M19 7l-3 6a3 3 0 0 0 6 0z"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 4 13C4 8 8 4 20 4c0 12-4 16-9 16z"/><path d="M5 19c2-4 5-7 10-9"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>',
  download: '<path d="M12 3v12"/><path d="M7 11l5 4 5-4"/><path d="M5 21h14"/>',
  upload: '<path d="M12 21V9"/><path d="M7 13l5-4 5 4"/><path d="M5 3h14"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  feather: '<path d="M20 4 9 15"/><path d="M20 4c-7 0-14 3-14 11v3h3c8 0 11-7 11-14z"/><path d="M5 19l4-4"/>'
};

export function icon(name, size = 24) {
  const body = ICONS[name] || '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/* ---------- toast ---------- */
let toastWrap = null;
export function toast(message, kind = '') {
  if (!toastWrap) {
    toastWrap = h('<div class="toastwrap" role="status" aria-live="polite"></div>');
    document.body.appendChild(toastWrap);
  }
  const t = h(`<div class="toast ${kind ? 'toast--' + kind : ''}">${kind === 'good' ? icon('check', 18) : ''}<span>${esc(message)}</span></div>`);
  toastWrap.appendChild(t);
  haptic(kind === 'bad' ? 'warning' : 'light');
  setTimeout(() => {
    t.style.transition = 'opacity .25s, transform .25s';
    t.style.opacity = '0'; t.style.transform = 'translateY(8px)';
    setTimeout(() => t.remove(), 250);
  }, 2400);
}

/* ---------- confirm modal (returns a Promise<boolean>) ---------- */
export function confirmModal({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const scrim = h(`
      <div class="scrim" role="dialog" aria-modal="true">
        <div class="modal">
          <h3>${esc(title)}</h3>
          ${message ? `<p>${esc(message)}</p>` : ''}
          <div class="modal__actions">
            <button class="btn btn--ghost" data-act="cancel">${esc(cancelText)}</button>
            <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-act="ok">${esc(confirmText)}</button>
          </div>
        </div>
      </div>`);
    const close = (val) => { scrim.remove(); document.removeEventListener('keydown', onKey); resolve(val); };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    on(scrim, 'click', (e) => {
      if (e.target === scrim) close(false);
      const b = e.target.closest('[data-act]');
      if (b) close(b.dataset.act === 'ok');
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(scrim);
    scrim.querySelector('[data-act="ok"]').focus();
  });
}

/* ---------- haptics (Capacitor-aware, falls back to Vibration API) ---------- */
export function haptic(style = 'light') {
  try {
    const cap = window.Capacitor;
    if (cap && cap.Plugins && cap.Plugins.Haptics) {
      const H = cap.Plugins.Haptics;
      if (style === 'success' || style === 'warning' || style === 'error') {
        H.notification({ type: style.toUpperCase() });
      } else {
        H.impact({ style: style === 'heavy' ? 'HEAVY' : style === 'medium' ? 'MEDIUM' : 'LIGHT' });
      }
      return;
    }
  } catch { /* fall through */ }
  if (navigator.vibrate) navigator.vibrate(style === 'warning' ? [20, 40, 20] : 12);
}

/* ---------- share / export download (Capacitor-aware) ---------- */
export async function shareOrDownload({ filename, text, mime = 'application/json' }) {
  // Native share sheet first (best on Android/iOS)
  try {
    const cap = window.Capacitor;
    if (cap && cap.Plugins && cap.Plugins.Share) {
      await cap.Plugins.Share.share({ title: filename, text });
      return;
    }
  } catch { /* fall through */ }
  if (navigator.share && mime.startsWith('text') === false) {
    try {
      const file = new File([text], filename, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch { /* fall through */ }
  }
  // Plain download
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ---------- tiny crypto for PIN hashing ---------- */
export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
