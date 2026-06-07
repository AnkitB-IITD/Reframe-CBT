/* ============================================================
   app.js — Bootstrap, shell, theme, gates (onboarding + lock), nav.
   ============================================================ */
import { db } from './db.js';
import { createRouter } from './router.js';
import { icon, h, on } from './ui.js';

import { HomeView } from './views/home.js';
import { WizardView } from './views/wizard.js';
import { HistoryView } from './views/history.js';
import { DetailView } from './views/detail.js';
import { InsightsView } from './views/insights-view.js';
import { SettingsView, applyReminder } from './views/settings.js';
import { CrisisView } from './views/crisis.js';
import { LearnView } from './views/learn.js';
import { runOnboarding } from './views/onboarding.js';
import { runLock } from './views/lock.js';

/* ---------- theme ---------- */
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme(mode) {
  const dark = mode === 'dark' || (mode === 'system' && mq.matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0c1311' : '#f6f8f7');
}

/* ---------- shell ---------- */
const NAV = [
  { name: 'home', label: 'Home', icon: 'home' },
  { name: 'history', label: 'History', icon: 'history' },
  { name: 'wizard', label: 'New', icon: 'plus', fab: true },
  { name: 'insights', label: 'Insights', icon: 'insights' },
  { name: 'settings', label: 'Settings', icon: 'settings' }
];
// Which nav item lights up for a given view.
const NAV_FOR = { home: 'home', history: 'history', detail: 'history', insights: 'insights', settings: 'settings' };

function buildShell() {
  const app = h(`
    <div class="app">
      <header class="hdr">
        <div class="hdr__title">${icon('feather', 22)} Unspiral</div>
        <div class="hdr__actions">
          <button class="iconbtn iconbtn--bare" id="hdr-crisis" aria-label="Get support" title="Get support">${icon('lifebuoy', 22)}</button>
          <button class="iconbtn iconbtn--bare" id="hdr-learn" aria-label="How Unspiral works" title="How Unspiral works">${icon('info', 22)}</button>
          <button class="iconbtn iconbtn--bare" id="hdr-theme" aria-label="Toggle theme">${icon('moon', 22)}</button>
        </div>
      </header>
      <main class="main" id="main"></main>
      <nav class="nav" aria-label="Primary">
        ${NAV.map((n) => n.fab
          ? `<button class="nav__item nav__fab" data-nav="${n.name}" aria-label="${n.label}"><span class="nav__fabCircle">${icon(n.icon, 26)}</span></button>`
          : `<button class="nav__item" data-nav="${n.name}"><span>${icon(n.icon, 24)}</span><span>${n.label}</span></button>`
        ).join('')}
      </nav>
    </div>`);
  return app;
}

/* ---------- boot ---------- */
async function boot() {
  // Keep our data through storage pressure (best-effort).
  db.requestPersistence();

  // Theme before first paint of the app shell.
  let themeMode = await db.getMeta('theme', 'system');
  applyTheme(themeMode);
  mq.addEventListener('change', () => { if (themeMode === 'system') { applyTheme('system'); updateThemeIcon(); } });

  // First-run onboarding.
  if (!(await db.getMeta('onboardingDone'))) {
    await runOnboarding();
    await db.setMeta('onboardingDone', true);
  }

  // App lock.
  const pinHash = await db.getMeta('pinHash');
  if (pinHash) await runLock(pinHash);

  // Mount shell.
  const root = document.getElementById('app');
  root.removeAttribute('aria-busy');
  const shell = buildShell();
  root.replaceChildren(shell);

  const main = shell.querySelector('#main');
  const navEl = shell.querySelector('.nav');

  const router = createRouter({
    mount: main,
    onChange: (name) => {
      const active = NAV_FOR[name] || null;
      navEl.querySelectorAll('[data-nav]').forEach((b) => {
        if (b.dataset.nav === active) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      });
      // Wizard/detail are immersive — drop the bottom padding so footers sit right.
      main.classList.toggle('main--flush', false);
    }
  });

  // Single source of truth for theme so the header toggle and the Settings
  // dropdown stay in sync. Stores the mode, applies it, updates the header
  // icon, and broadcasts so any mounted control can update itself.
  function updateThemeIcon() {
    const btn = shell.querySelector('#hdr-theme');
    if (btn) btn.innerHTML = icon(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon', 22);
  }
  async function setTheme(mode) {
    themeMode = mode;
    applyTheme(mode);
    updateThemeIcon();
    await db.setMeta('theme', mode);
    window.dispatchEvent(new CustomEvent('reframe:theme', { detail: mode }));
  }

  router
    .register('home', HomeView)
    .register('wizard', (ctx) => WizardView({ ...ctx }))
    .register('history', HistoryView)
    .register('detail', DetailView)
    .register('insights', InsightsView)
    .register('settings', (ctx) => SettingsView({ ...ctx, setTheme }))
    .register('crisis', CrisisView)
    .register('learn', LearnView);

  // Nav + header wiring.
  on(navEl, 'click', '[data-nav]', (e, el) => router.navigate(el.dataset.nav, {}));
  on(shell, 'click', '#hdr-crisis', () => router.navigate('crisis', {}));
  on(shell, 'click', '#hdr-learn', () => router.navigate('learn', {}));
  on(shell, 'click', '#hdr-theme', () => {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    setTheme(dark ? 'light' : 'dark');
  });
  updateThemeIcon(); // match current theme on first paint

  // Re-arm the daily reminder from stored prefs (no-op on web / when off).
  db.getMeta('reminder', { on: false, time: '20:00' }).then((r) => { if (r.on) applyReminder(true, r.time); });

  // Deep links: PWA shortcut / manifest action.
  const params = new URLSearchParams(location.search);
  if (params.get('action') === 'new') router.navigate('wizard', {});
  else router.navigate('home', {});
}

/* ---------- service worker (offline) ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline still works once cached */ });
  });
}

boot().catch((err) => {
  console.error('Boot failed:', err);
  const root = document.getElementById('app');
  root.innerHTML = '<div class="empty" style="padding-top:30vh"><p>Unspiral couldn’t start. Please reload.</p></div>';
});
