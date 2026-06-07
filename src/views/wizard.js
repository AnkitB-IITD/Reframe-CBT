/* ============================================================
   Wizard — the 7-column thought record.

   Design choices (from the product assessment):
   • Capture-first: only the "catch the thought" steps (situation,
     moods, hot thought) plus the balanced thought are required to
     complete. "Evidence for" and the re-rate are optional, so a
     distressed user is never blocked.
   • Resumable drafts: every step persists to IndexedDB, so closing the
     app mid-entry never loses work. "Save & finish later" is always there.
   • Edit: passing { id } loads an existing record (draft or complete).
   ============================================================ */
import { db } from '../db.js';
import { STEPS, EMOTIONS, TRAPS } from '../content.js';
import { icon, esc, clamp, h, on, toast, haptic, confirmModal, localDatetimeValue } from '../ui.js';

const TOTAL = 7;
const REQUIRED = new Set([1, 2, 3, 5, 6]); // 4 (evidence-for) & 7 (re-rate) optional

function blank() {
  return {
    id: null, status: 'draft', date: localDatetimeValue(), situation: '',
    moods: [], thoughts: '', hotThought: '', distortions: [],
    evidenceFor: '', evidenceAgainst: '', balancedThought: '', balancedBelief: 50,
    outcome: '', lastStep: 1
  };
}

export async function WizardView(ctx) {
  const data = ctx.params.id ? (await db.get(ctx.params.id)) || blank() : blank();
  if (!data.moods) data.moods = [];
  const wasComplete = data.status === 'complete';
  let step = clamp(data.lastStep || 1, 1, TOTAL);

  const view = h('<div class="view"><div class="wiz"></div></div>');
  const wiz = view.querySelector('.wiz');

  /* ---------- step bodies ---------- */
  function stepBody(s) {
    const meta = STEPS[s - 1];
    if (s === 1) return `
      <div class="field">
        <label for="w-date">When did this happen?</label>
        <input type="datetime-local" id="w-date" value="${esc(data.date)}">
      </div>
      <div class="field">
        <label for="w-sit">The situation</label>
        <textarea id="w-sit" placeholder="Where were you, who was there, what was happening?" rows="5">${esc(data.situation)}</textarea>
      </div>`;

    if (s === 2) return `
      <div class="moodpool" id="w-pool">
        ${poolChips()}
        <span class="customchip">
          <input type="text" id="w-custom" placeholder="Add your own" maxlength="24" aria-label="Add a custom emotion">
          <button type="button" id="w-custom-add" aria-label="Add emotion">${icon('plus', 18)}</button>
        </span>
      </div>
      <div id="w-moodcards">${moodCards()}</div>`;

    if (s === 3) return `
      <div class="field">
        <label for="w-thoughts">What went through your mind?</label>
        <textarea id="w-thoughts" placeholder="The thoughts, images, or memories that showed up…" rows="4">${esc(data.thoughts)}</textarea>
      </div>
      <div class="field">
        <label for="w-hot">Your “hot thought”</label>
        <input type="text" id="w-hot" placeholder="The one with the most charge" value="${esc(data.hotThought)}">
        <span class="hint">This is the thought you’ll weigh up in the next steps.</span>
      </div>
      <details class="disclosure" ${data.distortions.length ? 'open' : ''}>
        <summary>${icon('scales', 18)} Spot any thinking traps? (optional)</summary>
        <div class="traps" id="w-traps">
          ${TRAPS.map((t) => `
            <button type="button" class="trap" data-trap="${t.key}" aria-pressed="${data.distortions.includes(t.key)}">
              <strong>${esc(t.name)}</strong><span>${esc(t.desc)}</span>
            </button>`).join('')}
        </div>
      </details>`;

    if (s === 4) return hotBanner() + `
      <div class="field">
        <label for="w-for">Facts that support it</label>
        <textarea id="w-for" placeholder="What actually happened that fits this thought? Facts only — not feelings." rows="6">${esc(data.evidenceFor)}</textarea>
      </div>`;

    if (s === 5) return hotBanner() + `
      <div class="field">
        <label for="w-against">Facts that don’t fit</label>
        <textarea id="w-against" placeholder="What doesn’t match the thought? What would you tell a friend? Any other explanation?" rows="6">${esc(data.evidenceAgainst)}</textarea>
      </div>`;

    if (s === 6) return hotBanner() + `
      <div class="field">
        <label for="w-balanced">A fairer way to see it</label>
        <textarea id="w-balanced" placeholder="Bringing both sides together — what’s a more balanced, realistic thought?" rows="5">${esc(data.balancedThought)}</textarea>
      </div>
      <div class="field">
        <div class="util-row" style="justify-content:space-between">
          <label for="w-belief">How much do you believe it?</label>
          <span class="valbadge" id="w-belief-val">${data.balancedBelief}%</span>
        </div>
        <input type="range" class="slider" id="w-belief" min="0" max="100" value="${data.balancedBelief}">
      </div>`;

    if (s === 7) return `
      <div id="w-rerate">${rerateCards()}</div>
      <div class="field mt-4">
        <label for="w-outcome">One small next step (optional)</label>
        <textarea id="w-outcome" placeholder="Anything you’d like to do or remember after this?" rows="3">${esc(data.outcome)}</textarea>
      </div>`;
    return '';
  }

  function poolChips() {
    const names = [...new Set([...EMOTIONS, ...data.moods.map((m) => m.name)])];
    return names.map((n) => {
      const on = data.moods.some((m) => m.name === n);
      return `<button type="button" class="chip chip--accent" data-emotion="${esc(n)}" aria-pressed="${on}">${esc(n)}</button>`;
    }).join('');
  }

  function moodCards() {
    if (!data.moods.length) return `<p class="hint text-center mt-2">Tap the feelings above to rate how strong each one is.</p>`;
    return data.moods.map((m) => `
      <div class="moodcard" data-mood="${esc(m.name)}">
        <div class="moodcard__row">
          <span class="moodcard__name">${esc(m.name)}</span>
          <span class="util-row"><span class="valbadge" data-val>${m.pre}%</span>
            <button type="button" class="moodcard__remove" data-remove aria-label="Remove ${esc(m.name)}">${icon('trash', 18)}</button></span>
        </div>
        <input type="range" class="slider" min="0" max="100" value="${m.pre}" data-pre>
      </div>`).join('');
  }

  function rerateCards() {
    if (!data.moods.length) return `<p class="hint text-center">No emotions were added. You can go back to step 2 to add some.</p>`;
    return data.moods.map((m) => {
      const post = m.post != null ? m.post : m.pre;
      const diff = m.pre - post;
      return `
        <div class="rerate" data-mood="${esc(m.name)}">
          <div class="moodcard__row">
            <span class="moodcard__name">${esc(m.name)}</span>
            <span class="valbadge" data-val>${post}%</span>
          </div>
          <input type="range" class="slider" min="0" max="100" value="${post}" data-post>
          <div class="rerate__cmp">
            <span>Started at ${m.pre}%</span>
            <span data-diff>${diff > 0 ? `↓ ${diff}% lighter` : diff < 0 ? `↑ ${-diff}% stronger` : 'no change'}</span>
          </div>
        </div>`;
    }).join('');
  }

  function hotBanner() {
    return `<div class="hotbanner"><span>Hot thought</span><p>“${esc(data.hotThought || '…')}”</p></div>`;
  }

  /* ---------- shell ---------- */
  function render() {
    const meta = STEPS[step - 1];
    wiz.innerHTML = `
      <div class="wiz__head">
        <div class="wiz__bar">
          <button class="btn btn--quiet" data-cancel>${icon('back', 18)} Cancel</button>
          <span class="wiz__steplbl">Step ${step} of ${TOTAL}</span>
        </div>
        <div class="wiz__track"><div class="wiz__fill" style="width:${(step / TOTAL) * 100}%"></div></div>
        <h1 class="wiz__title">${esc(meta.title)} ${meta.optional ? '<span class="optional">Optional</span>' : ''}</h1>
        <p class="wiz__help">${esc(meta.help)}</p>
      </div>
      <div class="wiz__body">${stepBody(step)}</div>
      <div>
        <div class="wiz__foot">
          ${step > 1 ? `<button class="btn btn--ghost" data-back>${icon('back', 18)} Back</button>` : ''}
          <button class="btn btn--primary" data-next>
            ${step === TOTAL ? 'Save record' : 'Continue'} ${step < TOTAL ? icon('back', 18).replace('M15 18l-6-6 6-6', 'M9 6l6 6-6 6') : icon('check', 18)}
          </button>
        </div>
        <div class="wiz__savedraft">
          <button class="btn btn--quiet" data-draft>${wasComplete ? 'Save changes & exit' : 'Save & finish later'}</button>
        </div>
      </div>`;
  }

  /* ---------- read DOM into data ---------- */
  function capture() {
    if (step === 1) {
      data.date = wiz.querySelector('#w-date').value || data.date;
      data.situation = wiz.querySelector('#w-sit').value.trim();
    } else if (step === 2) {
      wiz.querySelectorAll('.moodcard').forEach((c) => {
        const name = c.dataset.mood;
        const m = data.moods.find((x) => x.name === name);
        if (m) m.pre = Number(c.querySelector('[data-pre]').value);
      });
    } else if (step === 3) {
      data.thoughts = wiz.querySelector('#w-thoughts').value.trim();
      data.hotThought = wiz.querySelector('#w-hot').value.trim();
      data.distortions = [...wiz.querySelectorAll('.trap[aria-pressed="true"]')].map((b) => b.dataset.trap);
    } else if (step === 4) {
      data.evidenceFor = wiz.querySelector('#w-for').value.trim();
    } else if (step === 5) {
      data.evidenceAgainst = wiz.querySelector('#w-against').value.trim();
    } else if (step === 6) {
      data.balancedThought = wiz.querySelector('#w-balanced').value.trim();
      data.balancedBelief = Number(wiz.querySelector('#w-belief').value);
    } else if (step === 7) {
      wiz.querySelectorAll('.rerate').forEach((c) => {
        const name = c.dataset.mood;
        const m = data.moods.find((x) => x.name === name);
        if (m) m.post = Number(c.querySelector('[data-post]').value);
      });
      data.outcome = wiz.querySelector('#w-outcome').value.trim();
    }
    data.lastStep = step;
  }

  function validate() {
    if (!REQUIRED.has(step)) return true;
    if (step === 1 && !data.situation) return fail('Add a short note about what happened.');
    if (step === 2 && !data.moods.length) return fail('Pick at least one feeling.');
    if (step === 3 && !data.thoughts) return fail('Write the thought(s) that came up.');
    if (step === 3 && !data.hotThought) return fail('Choose the thought with the most charge.');
    if (step === 5 && !data.evidenceAgainst) return fail('Add at least one fact that doesn’t fit the thought.');
    if (step === 6 && !data.balancedThought) return fail('Write a more balanced thought to finish.');
    return true;
  }
  function fail(msg) { toast(msg, 'bad'); return false; }

  async function persistDraft(silent) {
    const saved = await db.put({ ...data, status: wasComplete ? 'complete' : 'draft' });
    data.id = saved.id;
    if (!silent) toast(wasComplete ? 'Changes saved' : 'Saved as draft', 'good');
  }

  /* ---------- events (attached ONCE; render only swaps innerHTML) ---------- */
  function setup() {
    on(wiz, 'click', '[data-cancel]', async () => {
      capture();
      const dirty = data.situation || data.moods.length || data.thoughts;
      if (dirty && !data.id) {
        const leave = await confirmModal({
          title: 'Discard this entry?', message: 'You haven’t saved yet. You can keep it as a draft instead.',
          confirmText: 'Discard', cancelText: 'Keep editing', danger: true
        });
        if (!leave) return;
      }
      ctx.navigate('home', {});
    });

    on(wiz, 'click', '[data-back]', () => { capture(); step--; persistDraft(true); render(); });

    on(wiz, 'click', '[data-next]', async () => {
      capture();
      if (!validate()) return;
      if (step === TOTAL) {
        haptic('success');
        await db.put({ ...data, status: 'complete' });
        toast('Thought record saved', 'good');
        ctx.navigate('home', {});
        return;
      }
      step++;
      await persistDraft(true);
      render();
    });

    on(wiz, 'click', '[data-draft]', async () => {
      capture();
      if (!data.situation) return fail('Add what happened before saving.');
      await persistDraft(false);
      ctx.navigate('home', {});
    });

    // Step 2 — emotion selection
    on(wiz, 'click', '[data-emotion]', (e, el) => {
      const name = el.dataset.emotion;
      const idx = data.moods.findIndex((m) => m.name === name);
      if (idx >= 0) data.moods.splice(idx, 1);
      else data.moods.push({ name, pre: 50, post: null });
      el.setAttribute('aria-pressed', idx < 0);
      wiz.querySelector('#w-moodcards').innerHTML = moodCards();
      haptic('light');
    });
    on(wiz, 'click', '#w-custom-add', addCustom);
    wiz.addEventListener('keydown', (e) => {
      if (e.target.id === 'w-custom' && e.key === 'Enter') { e.preventDefault(); addCustom(); }
    });

    on(wiz, 'click', '[data-remove]', (e, el) => {
      const name = el.closest('.moodcard').dataset.mood;
      data.moods = data.moods.filter((m) => m.name !== name);
      wiz.querySelector('#w-pool').innerHTML = poolChips() + wiz.querySelector('.customchip').outerHTML;
      wiz.querySelector('#w-moodcards').innerHTML = moodCards();
    });

    // live slider badges
    wiz.addEventListener('input', (e) => {
      const sl = e.target;
      if (!sl.classList.contains('slider')) return;
      if (sl.id === 'w-belief') { wiz.querySelector('#w-belief-val').textContent = `${sl.value}%`; return; }
      const card = sl.closest('.moodcard, .rerate');
      if (!card) return;
      card.querySelector('[data-val]').textContent = `${sl.value}%`;
      if (card.classList.contains('rerate')) {
        const name = card.dataset.mood;
        const m = data.moods.find((x) => x.name === name);
        const diff = (m ? m.pre : sl.value) - Number(sl.value);
        card.querySelector('[data-diff]').textContent =
          diff > 0 ? `↓ ${diff}% lighter` : diff < 0 ? `↑ ${-diff}% stronger` : 'no change';
      }
    });

    // traps toggle
    on(wiz, 'click', '.trap', (e, el) => {
      el.setAttribute('aria-pressed', el.getAttribute('aria-pressed') !== 'true');
    });
  }

  function addCustom() {
    const input = wiz.querySelector('#w-custom');
    const name = input.value.trim();
    if (!name) return;
    if (data.moods.some((m) => m.name.toLowerCase() === name.toLowerCase())) { toast('Already added'); return; }
    data.moods.push({ name, pre: 50, post: null });
    input.value = '';
    wiz.querySelector('#w-pool').innerHTML = poolChips() + wiz.querySelector('.customchip').outerHTML;
    wiz.querySelector('#w-moodcards').innerHTML = moodCards();
    wiz.querySelector('#w-custom').focus();
  }

  setup();
  render();
  return view;
}
