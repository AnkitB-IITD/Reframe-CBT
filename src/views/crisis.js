/* Crisis — always reachable support resources + a grounding exercise.
   A safety baseline expected of any mental-health app (and by app stores). */
import { CRISIS } from '../content.js';
import { icon, esc, h, on } from '../ui.js';

export async function CrisisView(ctx) {
  const view = h('<div class="view"></div>');
  view.innerHTML = `
    <button class="btn btn--quiet detail__back" data-back>${icon('back', 18)} Back</button>
    <h1 class="greeting" style="font-size:var(--fs-2xl)">You’re not alone</h1>

    <div class="crisis__intro mt-2">
      <p>${esc(CRISIS.intro)}</p>
    </div>

    ${CRISIS.lines.map((l) => `
      <a class="crisisline" href="${esc(l.action)}" ${l.action.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>
        <span class="crisisline__icon">${icon(l.action.startsWith('tel') ? 'phone' : l.action.startsWith('sms') ? 'bubble' : 'lifebuoy', 22)}</span>
        <span><strong>${esc(l.name)}</strong><span>${esc(l.detail)} · ${esc(l.region)}</span></span>
      </a>`).join('')}

    <div class="card mt-4">
      <strong>${icon('leaf', 18)} A grounding moment</strong>
      <p class="hint mt-2">${esc(CRISIS.grounding)}</p>
    </div>

    <p class="hint text-center mt-5">Numbers vary by country — “Find a helpline” lists services worldwide.</p>
  `;
  on(view, 'click', '[data-back]', () => history.length > 1 ? ctx.navigate('home', {}) : ctx.navigate('home', {}));
  return view;
}
