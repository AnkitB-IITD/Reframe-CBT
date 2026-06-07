/* Home — greeting, primary CTA, resume-draft, stats, recent entries. */
import { db } from '../db.js';
import { icon, esc, relativeDay, h, on } from '../ui.js';
import { computeMetrics, moodAverages } from '../insights.js';

function greet() {
  const hr = new Date().getHours();
  if (hr < 5) return 'Still up';
  if (hr < 12) return 'Good morning';
  if (hr < 18) return 'Good afternoon';
  return 'Good evening';
}

export function recordCard(rec) {
  const isDraft = rec.status === 'draft';
  const { pre, post } = moodAverages(rec);
  const moods = isDraft
    ? `<span class="moodbadge moodbadge--pre">Before ${pre}%</span>`
    : `<span class="moodbadge moodbadge--pre">${pre}%</span>
       <span class="moodbadge--arrow">${icon('back', 14).replace('M15 18l-6-6 6-6', 'M9 6l6 6-6 6')}</span>
       <span class="moodbadge moodbadge--post">${post}%</span>`;
  return `
    <button class="rec" data-id="${esc(rec.id)}">
      <div class="rec__top">
        <span class="rec__date">${esc(relativeDay(rec.date))}</span>
        ${isDraft ? '<span class="rec__tag rec__tag--draft">Draft</span>' : ''}
      </div>
      <div class="rec__situation">${esc(rec.situation || 'Untitled')}</div>
      ${rec.hotThought ? `<div class="rec__hot">“${esc(rec.hotThought)}”</div>` : ''}
      <div class="rec__moods">${moods}</div>
    </button>`;
}

export async function HomeView(ctx) {
  const [records, draft] = await Promise.all([db.all(), db.latestDraft()]);
  const m = computeMetrics(records);
  const recent = records.slice(0, 3);

  const view = h('<div class="view"></div>');
  view.innerHTML = `
    <h1 class="greeting">${greet()}.</h1>
    <p class="sub">How are you feeling right now?</p>

    <div class="hero">
      <h2>Work through a thought</h2>
      <p>Take a few minutes to notice what’s on your mind and look at it with fresh eyes.</p>
      <button class="btn btn--primary btn--lg btn--block" data-go="new">
        ${icon('feather', 20)} Start a thought record
      </button>
    </div>

    ${draft ? `
      <button class="resume" data-resume="${esc(draft.id)}">
        <span class="resume__icon">${icon('bookmark')}</span>
        <span class="resume__body">
          <strong>Pick up where you left off</strong>
          <p>${esc(draft.situation || 'Unfinished record')} · ${esc(relativeDay(draft.updatedAt))}</p>
        </span>
        ${icon('back', 20).replace('M15 18l-6-6 6-6', 'M9 6l6 6-6 6')}
      </button>` : ''}

    <div class="stats">
      <div class="stat"><div class="stat__val">${m.total}</div><div class="stat__lbl">Entries</div></div>
      <div class="stat"><div class="stat__val">${m.averageRelief}%</div><div class="stat__lbl">Avg relief</div></div>
      <div class="stat"><div class="stat__val">${m.streak}</div><div class="stat__lbl">Day streak</div></div>
    </div>

    <div class="sectionhead">
      <h2>Recent</h2>
      ${records.length > 3 ? '<button class="btn btn--quiet" data-go="history">View all</button>' : ''}
    </div>
    <div class="records">
      ${recent.length
        ? recent.map(recordCard).join('')
        : `<div class="empty">${icon('feather', 40)}<p>No entries yet. Your first thought record will appear here.</p></div>`}
    </div>

    <p class="hint text-center mt-5">Need to talk to someone? <a data-go="crisis" href="#">Find support →</a></p>
  `;

  on(view, 'click', '[data-go]', (e, el) => {
    e.preventDefault();
    const go = el.dataset.go;
    if (go === 'new') ctx.navigate('wizard', {});
    else if (go === 'history') ctx.navigate('history', {});
    else if (go === 'crisis') ctx.navigate('crisis', {});
  });
  on(view, 'click', '[data-resume]', (e, el) => ctx.navigate('wizard', { id: el.dataset.resume }));
  on(view, 'click', '.rec', (e, el) => ctx.navigate('detail', { id: el.dataset.id }));

  return view;
}
