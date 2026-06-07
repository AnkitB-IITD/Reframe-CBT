/* History — search + filter across all records (incl. drafts & custom emotions). */
import { db } from '../db.js';
import { icon, esc, h, on } from '../ui.js';
import { recordCard } from './home.js';

export async function HistoryView(ctx) {
  const records = await db.all();
  // Build the emotion filter from emotions that actually appear (incl. custom).
  const emotions = [...new Set(records.flatMap((r) => (r.moods || []).map((m) => m.name)))].sort();

  const view = h('<div class="view"></div>');
  view.innerHTML = `
    <div class="sectionhead"><h1 class="greeting" style="font-size:var(--fs-2xl)">History</h1></div>
    <div class="searchbar">
      <input type="search" id="h-q" placeholder="Search situations, thoughts…" aria-label="Search records">
      <select id="h-mood" aria-label="Filter by emotion">
        <option value="">All feelings</option>
        ${emotions.map((e) => `<option value="${esc(e)}">${esc(e)}</option>`).join('')}
      </select>
    </div>
    <div class="records" id="h-list"></div>`;

  const list = view.querySelector('#h-list');
  const q = view.querySelector('#h-q');
  const moodSel = view.querySelector('#h-mood');

  function apply() {
    const term = q.value.trim().toLowerCase();
    const mood = moodSel.value;
    const filtered = records.filter((r) => {
      const hay = [r.situation, r.thoughts, r.hotThought, r.balancedThought, r.evidenceAgainst]
        .filter(Boolean).join(' ').toLowerCase();
      const matchesTerm = !term || hay.includes(term);
      const matchesMood = !mood || (r.moods || []).some((m) => m.name === mood);
      return matchesTerm && matchesMood;
    });
    list.innerHTML = filtered.length
      ? filtered.map(recordCard).join('')
      : `<div class="empty">${icon('history', 40)}<p>${records.length ? 'No records match your search.' : 'Nothing here yet.'}</p></div>`;
  }

  q.addEventListener('input', apply);
  moodSel.addEventListener('change', apply);
  on(view, 'click', '.rec', (e, el) => ctx.navigate('detail', { id: el.dataset.id }));
  apply();
  return view;
}
