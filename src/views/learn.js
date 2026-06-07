/* Learn — a gentle primer for people new to CBT, a way to replay the
   intro, and links to the strongest research. Reachable from Settings. */
import { LEARN, RESEARCH } from '../content.js';
import { icon, esc, h, on } from '../ui.js';
import { runOnboarding } from './onboarding.js';

export async function LearnView(ctx) {
  const view = h('<div class="view"></div>');
  view.innerHTML = `
    <button class="btn btn--quiet detail__back" data-back>${icon('back', 18)} Back</button>
    <h1 class="greeting" style="font-size:var(--fs-2xl)">How Reframe works</h1>
    <p class="sub">New to this? Here’s the idea in a minute.</p>

    <div class="card mt-4">
      <h3 class="learn__h">${esc(LEARN.what.title)}</h3>
      <p class="learn__p">${esc(LEARN.what.body)}</p>
    </div>

    <div class="card">
      <h3 class="learn__h">${esc(LEARN.record.title)}</h3>
      <p class="learn__p">${esc(LEARN.record.body)}</p>
      <ol class="learn__cols">
        ${LEARN.columns.map((c) => `<li>${esc(c)}</li>`).join('')}
      </ol>
    </div>

    <button class="btn btn--primary btn--block btn--lg mt-2" data-replay>
      ${icon('play', 20)} Replay the intro
    </button>

    <div class="sectionhead"><h2>The evidence</h2></div>
    <p class="hint mb-3">CBT and the thought record are among the most researched tools in mental health. A few key studies:</p>
    ${RESEARCH.map((r) => `
      <a class="research" href="${esc(r.url)}" target="_blank" rel="noopener">
        <div class="research__body">
          <strong>${esc(r.title)}</strong>
          <span class="research__cite">${esc(r.cite)}</span>
          <p>${esc(r.note)}</p>
        </div>
        <span class="research__ext">${icon('external', 18)}</span>
      </a>`).join('')}

    <p class="hint text-center mt-5">Reframe is a self-help tool, not a substitute for professional care.</p>
  `;

  on(view, 'click', '[data-back]', () => ctx.navigate('settings', {}));
  on(view, 'click', '[data-replay]', async () => {
    await runOnboarding();        // standalone overlay; resolves when finished
    ctx.navigate('home', {});
  });
  return view;
}
