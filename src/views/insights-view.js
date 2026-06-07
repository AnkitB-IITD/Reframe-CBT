/* Insights — mood trends + thinking-trap patterns over completed records. */
import { db } from '../db.js';
import { icon, h } from '../ui.js';
import { computeMetrics, moodTrendSVG, trapBarsSVG } from '../insights.js';

export async function InsightsView() {
  const records = await db.all();
  const m = computeMetrics(records);

  const view = h('<div class="view"></div>');
  view.innerHTML = `
    <div class="sectionhead"><h1 class="greeting" style="font-size:var(--fs-2xl)">Insights</h1></div>
    <p class="sub">A quiet look at your progress. All worked out on your device.</p>

    <div class="stats mt-4">
      <div class="stat"><div class="stat__val">${m.total}</div><div class="stat__lbl">Completed</div></div>
      <div class="stat"><div class="stat__val">${m.averageRelief}%</div><div class="stat__lbl">Avg relief</div></div>
      <div class="stat"><div class="stat__val">${m.streak}</div><div class="stat__lbl">Day streak</div></div>
    </div>

    <div class="chartcard mt-4">
      <h3>Mood intensity</h3>
      <p class="hint">Average feeling strength before and after reframing.</p>
      ${m.trend.length
        ? moodTrendSVG(m.trend) + `<div class="legend">
            <span><span class="dot" style="background:var(--bad)"></span>Before</span>
            <span><span class="dot" style="background:var(--good)"></span>After</span></div>`
        : `<div class="empty">${icon('insights', 40)}<p>Complete a couple of records to see your trend.</p></div>`}
    </div>

    <div class="chartcard">
      <h3>Thinking traps</h3>
      <p class="hint">The patterns you notice most often.</p>
      ${Object.keys(m.trapCounts).length
        ? trapBarsSVG(m.trapCounts)
        : `<div class="empty">${icon('scales', 40)}<p>Tag thinking traps in step 3 to see patterns here.</p></div>`}
    </div>`;
  return view;
}
