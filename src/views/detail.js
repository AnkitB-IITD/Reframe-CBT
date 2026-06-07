/* Detail — full record view, with edit / share / delete and a printable
   7-column layout for sharing with a therapist. */
import { db } from '../db.js';
import { TRAP_BY_KEY } from '../content.js';
import { icon, esc, fmtDateTime, h, on, toast, confirmModal, shareOrDownload } from '../ui.js';

function moodRow(m) {
  const post = m.post != null ? m.post : m.pre;
  const diff = m.pre - post;
  const tag = diff > 0 ? `<span class="moodbadge moodbadge--post">↓ ${diff}%</span>` : '';
  return `<div class="dmood"><span class="dmood__name">${esc(m.name)}</span>
    <span class="dmood__rate"><span class="text-bad">${m.pre}%</span> → <span style="color:var(--good)">${post}%</span> ${tag}</span></div>`;
}

function recordToText(r) {
  const moods = (r.moods || []).map((m) => `${m.name}: ${m.pre}%${m.post != null ? ` → ${m.post}%` : ''}`).join(', ');
  const traps = (r.distortions || []).map((k) => (TRAP_BY_KEY[k] || {}).name || k).join(', ');
  return [
    `Thought record — ${fmtDateTime(r.date)}`,
    ``,
    `1. Situation: ${r.situation || '—'}`,
    `2. Moods: ${moods || '—'}`,
    `3. Thoughts: ${r.thoughts || '—'}`,
    `   Hot thought: ${r.hotThought || '—'}`,
    traps ? `   Thinking traps: ${traps}` : '',
    `4. Evidence for: ${r.evidenceFor || '—'}`,
    `5. Evidence against: ${r.evidenceAgainst || '—'}`,
    `6. Balanced thought: ${r.balancedThought || '—'} (believe ${r.balancedBelief ?? '—'}%)`,
    `7. Outcome: ${r.outcome || '—'}`,
    ``, `— made with Reframe`
  ].filter((l) => l !== '').join('\n');
}

export async function DetailView(ctx) {
  const r = await db.get(ctx.params.id);
  const view = h('<div class="view printable"></div>');
  if (!r) { view.innerHTML = '<div class="empty"><p>This record could not be found.</p></div>'; return view; }

  const traps = (r.distortions || []).map((k) => `<span class="dtag">${esc((TRAP_BY_KEY[k] || {}).name || k)}</span>`).join('');

  view.innerHTML = `
    <div class="print-head">
      <div class="k">Cognitive Behavioural Therapy</div>
      <div class="t">7-Column Thought Record</div>
      <div class="m"><span>${esc(fmtDateTime(r.date))}</span><span>Reframe</span></div>
    </div>

    <button class="btn btn--quiet detail__back" data-back>${icon('back', 18)} Back</button>
    <div class="detail__date">${esc(fmtDateTime(r.date))}${r.status === 'draft' ? ' · <strong style="color:var(--warn)">Draft</strong>' : ''}</div>

    <div class="detailwrap">
      <div class="dsec ${r.situation ? '' : 'dsec--empty'}"><h3>1 · Situation</h3><p>${esc(r.situation) || 'Not added'}</p></div>
      <div class="dsec"><h3>2 · Moods</h3><div class="dmoods">${(r.moods || []).map(moodRow).join('') || '<p>Not added</p>'}</div></div>
      <div class="dsec"><h3>3 · Thoughts</h3>
        <p>${esc(r.thoughts) || 'Not added'}</p>
        ${r.hotThought ? `<div class="dhot"><h3>Hot thought</h3><p style="font-style:italic">“${esc(r.hotThought)}”</p></div>` : ''}
        ${traps ? `<div>${traps}</div>` : ''}
      </div>
      <div class="dsec ${r.evidenceFor ? '' : 'dsec--empty'}"><h3>4 · Evidence for</h3><p>${esc(r.evidenceFor) || 'Not added'}</p></div>
      <div class="dsec ${r.evidenceAgainst ? '' : 'dsec--empty'}"><h3>5 · Evidence against</h3><p>${esc(r.evidenceAgainst) || 'Not added'}</p></div>
      <div class="dsec ${r.balancedThought ? '' : 'dsec--empty'}"><h3>6 · Balanced thought</h3>
        <p>${esc(r.balancedThought) || 'Not added'}</p>
        ${r.balancedThought ? `<span class="belief">${icon('check', 16)} Believe it ${r.balancedBelief}%</span>` : ''}
      </div>
      <div class="dsec ${r.outcome ? '' : 'dsec--empty'}"><h3>7 · Outcome</h3><p>${esc(r.outcome) || 'Not added'}</p></div>
    </div>

    <div class="detail__actions">
      <button class="btn btn--ghost" data-edit>${icon('edit', 18)} Edit</button>
      <button class="btn btn--ghost" data-share>${icon('share', 18)} Share</button>
      <button class="btn btn--ghost text-bad" data-del aria-label="Delete">${icon('trash', 18)}</button>
    </div>`;

  on(view, 'click', '[data-back]', () => ctx.navigate('history', {}));
  on(view, 'click', '[data-edit]', () => ctx.navigate('wizard', { id: r.id }));
  on(view, 'click', '[data-share]', async () => {
    const sheet = await confirmModal({
      title: 'Share record', message: 'Share as text, or print a clinician-style worksheet (Save as PDF).',
      confirmText: 'Print / PDF', cancelText: 'Share text'
    });
    if (sheet) { window.print(); }
    else { await shareOrDownload({ filename: `thought-record-${r.id}.txt`, text: recordToText(r), mime: 'text/plain' }); }
  });
  on(view, 'click', '[data-del]', async () => {
    const ok = await confirmModal({
      title: 'Delete this record?', message: 'This can’t be undone.',
      confirmText: 'Delete', danger: true
    });
    if (!ok) return;
    await db.remove(r.id);
    toast('Record deleted');
    ctx.navigate('history', {});
  });

  return view;
}
