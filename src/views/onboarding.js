/* Onboarding — first-run intro. Full-screen overlay; resolves when done. */
import { ONBOARDING, DISCLAIMER } from '../content.js';
import { icon, esc, h, on } from '../ui.js';

const ART = { bubble: 'bubble', scales: 'scales', lock: 'lock' };

export function runOnboarding() {
  return new Promise((resolve) => {
    let i = 0;
    const fs = h('<div class="fs"><div class="onb"></div></div>');
    const onb = fs.querySelector('.onb');

    function render() {
      const slide = ONBOARDING[i];
      const last = i === ONBOARDING.length - 1;
      onb.innerHTML = `
        <div class="onb__art">
          ${icon(ART[slide.art] || 'leaf', 96)}
          <h2>${esc(slide.title)}</h2>
          <p>${esc(slide.body)}</p>
        </div>
        <div class="onb__dots">
          ${ONBOARDING.map((_, k) => `<span class="onb__dot" data-on="${k === i}"></span>`).join('')}
        </div>
        ${last ? `<p class="hint text-center mb-3">${esc(DISCLAIMER)}</p>` : ''}
        <div class="onb__foot">
          <button class="btn btn--quiet" data-skip>${last ? '' : 'Skip'}</button>
          <button class="btn btn--primary" data-next>${last ? 'Get started' : 'Next'}</button>
        </div>`;
    }

    function done() { fs.remove(); resolve(); }
    on(fs, 'click', '[data-skip]', done);
    on(fs, 'click', '[data-next]', () => { if (i < ONBOARDING.length - 1) { i++; render(); } else done(); });

    render();
    document.body.appendChild(fs);
  });
}
