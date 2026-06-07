/* Settings — privacy (PIN lock), reminders, appearance, data, support. */
import { db } from '../db.js';
import { DISCLAIMER } from '../content.js';
import { icon, esc, h, on, toast, confirmModal, shareOrDownload, sha256 } from '../ui.js';
import { setAnalyticsEnabled, APTABASE_APP_KEY, track } from '../analytics.js';
import { getEntitlement } from '../entitlement.js';

/* ---- CSV builder (kept here; db stays format-agnostic) ---- */
function toCSV(records) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Date', 'Status', 'Situation', 'Moods (before)', 'Hot thought', 'Thinking traps',
    'Evidence for', 'Evidence against', 'Balanced thought', 'Belief %', 'Moods (after)', 'Outcome'];
  const rows = records.map((r) => [
    r.date, r.status, r.situation,
    (r.moods || []).map((m) => `${m.name} ${m.pre}%`).join('; '),
    r.hotThought, (r.distortions || []).join('; '),
    r.evidenceFor, r.evidenceAgainst, r.balancedThought, r.balancedBelief,
    (r.moods || []).map((m) => `${m.name} ${m.post ?? m.pre}%`).join('; '), r.outcome
  ].map(cell).join(','));
  return [head.map(cell).join(','), ...rows].join('\n');
}

/* ---- set-a-PIN modal (4 digits) ---- */
function setPinModal() {
  return new Promise((resolve) => {
    const scrim = h(`
      <div class="scrim" role="dialog" aria-modal="true">
        <div class="modal">
          <h3>Set a 4-digit PIN</h3>
          <p>You’ll enter this each time you open Reframe.</p>
          <input type="password" inputmode="numeric" maxlength="4" id="pin1" placeholder="••••" style="text-align:center;letter-spacing:.5em;font-size:1.4rem">
          <input type="password" inputmode="numeric" maxlength="4" id="pin2" placeholder="Confirm" class="mt-2" style="text-align:center;letter-spacing:.5em;font-size:1.4rem">
          <div class="modal__actions mt-4">
            <button class="btn btn--ghost" data-act="cancel">Cancel</button>
            <button class="btn btn--primary" data-act="ok">Save PIN</button>
          </div>
        </div>
      </div>`);
    const close = (v) => { scrim.remove(); resolve(v); };
    on(scrim, 'click', (e) => {
      if (e.target === scrim) return close(null);
      const b = e.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'cancel') return close(null);
      const a = scrim.querySelector('#pin1').value, c = scrim.querySelector('#pin2').value;
      if (!/^\d{4}$/.test(a)) return toast('PIN must be 4 digits', 'bad');
      if (a !== c) return toast('PINs don’t match', 'bad');
      close(a);
    });
    document.body.appendChild(scrim);
    scrim.querySelector('#pin1').focus();
  });
}

export async function SettingsView(ctx) {
  const [pinHash, theme, reminder, analyticsOptOut, ent] = await Promise.all([
    db.getMeta('pinHash'), db.getMeta('theme', 'system'),
    db.getMeta('reminder', { on: false, time: '20:00' }),
    db.getMeta('analyticsOptOut', false), getEntitlement()
  ]);
  const planLabel = ent.status === 'pro' ? 'Reframe Pro'
    : ent.status === 'trial' ? `Pro trial · ${ent.trialDaysLeft} days left`
    : 'Free';

  const view = h('<div class="view"></div>');
  view.innerHTML = `
    <div class="sectionhead"><h1 class="greeting" style="font-size:var(--fs-2xl)">Settings</h1></div>

    <div class="card">
      <div class="setrow">
        <div class="setrow__body"><strong>App lock</strong><p>Require a PIN to open Reframe. Use fingerprint/face in the installed app.</p></div>
        <label class="switch"><input type="checkbox" id="s-lock" ${pinHash ? 'checked' : ''}><span class="switch__track"></span></label>
      </div>
      <div class="setrow">
        <div class="setrow__body"><strong>Daily reminder</strong><p>A gentle nudge to check in. Notifications work in the installed app.</p></div>
        <div class="setrow__actions">
          <input type="time" id="s-rtime" value="${esc(reminder.time)}" style="width:auto" ${reminder.on ? '' : 'disabled'}>
          <label class="switch"><input type="checkbox" id="s-reminder" ${reminder.on ? 'checked' : ''}><span class="switch__track"></span></label>
        </div>
      </div>
      <div class="setrow">
        <div class="setrow__body"><strong>Anonymous usage stats</strong><p>Share anonymous counts (like “a record was completed”) to help improve Reframe. No thoughts or personal data — ever.</p></div>
        <label class="switch"><input type="checkbox" id="s-analytics" ${analyticsOptOut ? '' : 'checked'}><span class="switch__track"></span></label>
      </div>
    </div>

    <div class="card">
      <div class="setrow">
        <div class="setrow__body"><strong>Appearance</strong><p>Theme</p></div>
        <select id="s-theme" style="width:auto">
          <option value="system" ${theme === 'system' ? 'selected' : ''}>System</option>
          <option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option>
          <option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option>
        </select>
      </div>
    </div>

    <div class="card">
      <div class="setrow">
        <div class="setrow__body"><strong>Your plan · ${esc(planLabel)}</strong><p>Reframe is completely free right now — every feature, no account, no limits. 🌱</p></div>
      </div>
    </div>

    <div class="card">
      <div class="setrow">
        <div class="setrow__body"><strong>Export all your data</strong><p>A complete backup of every record and your settings. Everything stays on this device unless you share it.</p></div>
      </div>
      <button class="btn btn--primary btn--block mt-2" data-export="json">${icon('download', 18)} Export all (JSON backup)</button>
      <div class="util-row mt-2" style="gap:var(--s-2)">
        <button class="btn btn--ghost" data-export="csv">${icon('download', 18)} Export as CSV</button>
        <button class="btn btn--ghost" data-import>${icon('upload', 18)} Import backup</button>
        <input type="file" id="s-file" accept="application/json,.json" hidden>
      </div>
    </div>

    <button class="navlink" data-go="learn">
      <span class="navlink__icon">${icon('book', 20)}</span>
      <span class="navlink__body"><strong>How Reframe works</strong><p>New to CBT? A 1-minute primer and the research behind it.</p></span>
      <span class="navlink__chev">${icon('chevron', 20)}</span>
    </button>

    <button class="navlink navlink--accent" data-go="crisis">
      <span class="navlink__icon">${icon('lifebuoy', 20)}</span>
      <span class="navlink__body"><strong>Get support now</strong><p>Crisis lines and a grounding exercise.</p></span>
      <span class="navlink__chev">${icon('chevron', 20)}</span>
    </button>

    <div class="card danger-zone mt-4">
      <div class="setrow">
        <div class="setrow__body"><strong class="text-bad">Erase all data</strong><p>Permanently delete every record and setting from this device.</p></div>
        <button class="btn btn--danger" data-clear>Erase</button>
      </div>
    </div>

    <p class="hint text-center mt-5">${esc(DISCLAIMER)}</p>
    <p class="hint text-center mt-2">Reframe · v1.0 · made with care</p>
  `;

  // ---- app lock ----
  on(view, 'change', '#s-lock', async (e) => {
    if (e.target.checked) {
      const pin = await setPinModal();
      if (!pin) { e.target.checked = false; return; }
      await db.setMeta('pinHash', await sha256(pin));
      toast('App lock on', 'good');
    } else {
      const ok = await confirmModal({ title: 'Turn off app lock?', confirmText: 'Turn off', danger: true });
      if (!ok) { e.target.checked = true; return; }
      await db.setMeta('pinHash', null);
      toast('App lock off');
    }
  });

  // ---- reminder ----
  const rtime = view.querySelector('#s-rtime');
  const rtoggle = view.querySelector('#s-reminder');

  on(view, 'change', '#s-reminder', async (e) => {
    const onState = e.target.checked;
    rtime.disabled = !onState;
    const ok = await applyReminder(onState, rtime.value);
    if (onState && !ok) { e.target.checked = true; rtime.disabled = true; return; } // permission denied → revert
    await db.setMeta('reminder', { on: onState, time: rtime.value });
    toast(onState ? `Reminder set for ${rtime.value}` : 'Reminder off', onState ? 'good' : '');
  });

  on(view, 'change', '#s-rtime', async () => {
    const r = await db.getMeta('reminder', { on: false, time: '20:00' });
    await db.setMeta('reminder', { ...r, time: rtime.value });
    if (rtoggle.checked) { await applyReminder(true, rtime.value); toast(`Reminder moved to ${rtime.value}`, 'good'); }
  });

  // ---- anonymous analytics opt-in/out ----
  on(view, 'change', '#s-analytics', async (e) => {
    await setAnalyticsEnabled(e.target.checked);
    if (e.target.checked && !APTABASE_APP_KEY) {
      toast('Saved — analytics activate once a key is configured');
    } else {
      toast(e.target.checked ? 'Thanks for helping improve Reframe' : 'Analytics off', e.target.checked ? 'good' : '');
    }
  });

  // ---- theme (kept in sync with the header toggle) ----
  const themeSel = view.querySelector('#s-theme');
  on(view, 'change', '#s-theme', (e) => {
    if (ctx.setTheme) ctx.setTheme(e.target.value);
    else { db.setMeta('theme', e.target.value); applyThemeFallback(e.target.value); }
  });
  // When the header toggle changes the theme, reflect it in this dropdown.
  const onThemeBroadcast = (e) => { if (document.body.contains(themeSel)) themeSel.value = e.detail; };
  window.addEventListener('reframe:theme', onThemeBroadcast);

  // ---- backup ----
  on(view, 'click', '[data-export]', async (e, el) => {
    const records = await db.all();
    if (el.dataset.export === 'json') {
      const stamp = new Date().toISOString().slice(0, 10);
      await shareOrDownload({ filename: `reframe-backup-${stamp}.json`, text: JSON.stringify(await db.exportData(), null, 2) });
      track('export', { format: 'json', records: records.length });
    } else {
      if (!records.length) return toast('No records to export yet');
      await shareOrDownload({ filename: 'reframe-records.csv', text: toCSV(records), mime: 'text/csv' });
      track('export', { format: 'csv', records: records.length });
    }
  });
  on(view, 'click', '[data-import]', () => view.querySelector('#s-file').click());
  on(view, 'change', '#s-file', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const count = await db.importData(JSON.parse(ev.target.result));
        toast(`Imported ${count} record${count === 1 ? '' : 's'}`, 'good');
      } catch (err) { toast(err.message || 'Import failed', 'bad'); }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  // ---- crisis & erase ----
  on(view, 'click', '[data-go]', (e, el) => ctx.navigate(el.dataset.go, {}));
  on(view, 'click', '[data-clear]', async () => {
    const ok = await confirmModal({
      title: 'Erase everything?', message: 'All records and settings will be permanently deleted from this device.',
      confirmText: 'Erase all', danger: true
    });
    if (!ok) return;
    await db.clearAll();
    toast('All data erased');
    ctx.navigate('home', {});
  });

  return view;
}

function applyThemeFallback(mode) {
  const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}

/* Schedule (or cancel) the daily reminder via Capacitor LocalNotifications.
   Returns true on success / on web (where the preference is stored and fires
   once installed); returns false only when the user denies notification
   permission, so the caller can revert the toggle. */
const REMINDER_ID = 1001;
const REMINDER_CHANNEL = 'reframe-reminders';
export async function applyReminder(onState, time) {
  const LN = window.Capacitor?.Plugins?.LocalNotifications;
  if (!LN) return true; // web: nothing to schedule reliably; honoured in the native build

  try {
    if (!onState) {
      await LN.cancel({ notifications: [{ id: REMINDER_ID }] });
      return true;
    }
    const perm = await LN.requestPermissions();
    if (perm.display !== 'granted') { toast('Allow notifications to use reminders', 'bad'); return false; }

    // Android 8+ needs an explicit channel.
    if (LN.createChannel) {
      try { await LN.createChannel({ id: REMINDER_CHANNEL, name: 'Daily reminders', importance: 4, visibility: 1 }); } catch {}
    }
    const [hh, mm] = time.split(':').map(Number);
    await LN.cancel({ notifications: [{ id: REMINDER_ID }] }); // avoid duplicates
    await LN.schedule({
      notifications: [{
        id: REMINDER_ID,
        title: 'Reframe',
        body: 'A quiet moment to check in with your thoughts?',
        channelId: REMINDER_CHANNEL,
        schedule: { on: { hour: hh, minute: mm }, repeats: true, allowWhileIdle: true }
      }]
    });
    return true;
  } catch (err) {
    console.error('Reminder scheduling failed:', err);
    return true; // don't trap the user's toggle on a transient native error
  }
}
