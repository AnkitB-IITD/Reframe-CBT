/* ============================================================
   insights.js — Analytics over completed records.
   Pure compute + dependency-free SVG chart builders.
   ============================================================ */
import { esc, fmtDate } from './ui.js';
import { TRAP_BY_KEY } from './content.js';

const avg = (arr) => arr.length ? arr.reduce((a, b) => a + Number(b), 0) / arr.length : 0;

export function moodAverages(rec) {
  const pre = (rec.moods || []).map((m) => m.pre);
  const post = (rec.moods || []).map((m) => (m.post != null ? m.post : m.pre));
  return { pre: Math.round(avg(pre)), post: Math.round(avg(post)) };
}

export function computeMetrics(records) {
  const done = records.filter((r) => r.status === 'complete');

  // Average emotional relief (pre - post), floored at 0 for display.
  const reliefs = done.map((r) => {
    const { pre, post } = moodAverages(r);
    return pre - post;
  }).filter((v) => !Number.isNaN(v));
  const averageRelief = reliefs.length ? Math.max(0, Math.round(avg(reliefs))) : 0;

  // Streak of consecutive calendar days with an entry, anchored to today/yesterday.
  // Compare yyyy-mm-dd strings in LOCAL time to avoid UTC-midnight drift.
  const dayKey = (iso) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  const daySet = new Set(done.map((r) => dayKey(r.date)));
  let streak = 0;
  const cursor = new Date();
  const todayKey = dayKey(cursor.toISOString());
  const yKey = (() => { const y = new Date(); y.setDate(y.getDate() - 1); return dayKey(y.toISOString()); })();
  if (daySet.has(todayKey) || daySet.has(yKey)) {
    if (!daySet.has(todayKey)) cursor.setDate(cursor.getDate() - 1); // start from yesterday
    while (daySet.has(dayKey(cursor.toISOString()))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // Trend: last 10 completed records, chronological.
  const trend = [...done].slice(0, 10).reverse().map((r) => {
    const { pre, post } = moodAverages(r);
    return { date: fmtDate(r.date, { month: 'short', day: 'numeric' }), pre, post };
  });

  // Thinking-trap frequency.
  const trapCounts = {};
  done.forEach((r) => (r.distortions || []).forEach((k) => { trapCounts[k] = (trapCounts[k] || 0) + 1; }));

  return { total: done.length, averageRelief, streak, trend, trapCounts };
}

/* ---------- charts ---------- */

export function moodTrendSVG(trend, width = 480) {
  if (!trend.length) return '';
  const W = width, H = 200, pl = 34, pr = 14, pt = 16, pb = 26;
  const cw = W - pl - pr, ch = H - pt - pb;
  const n = trend.length;
  const x = (i) => pl + (n > 1 ? (i * cw) / (n - 1) : cw / 2);
  const y = (v) => pt + ch - (v / 100) * ch;

  let grid = '';
  for (let g = 0; g <= 4; g++) {
    const gy = y(g * 25);
    grid += `<line x1="${pl}" y1="${gy}" x2="${W - pr}" y2="${gy}" stroke="var(--border)" stroke-dasharray="3 4"/>`
      + `<text x="${pl - 8}" y="${gy + 3}" fill="var(--text-mute)" font-size="9" text-anchor="end">${g * 25}</text>`;
  }

  const path = (key) => trend.map((t, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(t[key]).toFixed(1)}`).join(' ');
  const dots = (key, color) => trend.map((t, i) =>
    `<circle cx="${x(i).toFixed(1)}" cy="${y(t[key]).toFixed(1)}" r="3.6" fill="var(--surface)" stroke="${color}" stroke-width="2.2"/>`).join('');
  const labels = trend.map((t, i) =>
    `<text x="${x(i).toFixed(1)}" y="${H - 8}" fill="var(--text-mute)" font-size="8.5" text-anchor="middle">${esc(t.date)}</text>`).join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="chartbox" role="img" aria-label="Mood intensity before and after, over time">
    ${grid}
    <path d="${path('pre')}" fill="none" stroke="var(--bad)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${path('post')}" fill="none" stroke="var(--good)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots('pre', 'var(--bad)')}${dots('post', 'var(--good)')}
    ${labels}
  </svg>`;
}

export function trapBarsSVG(trapCounts, width = 480) {
  const list = Object.entries(trapCounts).sort((a, b) => b[1] - a[1]);
  if (!list.length) return '';
  const lw = 130, pr = 30, bh = 22, gap = 12, pt = 6;
  const W = width, cw = W - lw - pr;
  const H = list.length * (bh + gap) + pt;
  const max = Math.max(...list.map(([, c]) => c));

  const rows = list.map(([key, count], i) => {
    const y = pt + i * (bh + gap);
    const w = max ? (count / max) * cw : 0;
    const name = (TRAP_BY_KEY[key] && TRAP_BY_KEY[key].name) || key;
    return `<text x="${lw - 8}" y="${y + bh / 2 + 3.5}" fill="var(--text)" font-size="10" text-anchor="end">${esc(name)}</text>
      <rect x="${lw}" y="${y}" width="${cw}" height="${bh}" rx="6" fill="var(--surface-2)"/>
      <rect x="${lw}" y="${y}" width="${w.toFixed(1)}" height="${bh}" rx="6" fill="var(--primary)"/>
      <text x="${lw + w + 7}" y="${y + bh / 2 + 3.5}" fill="var(--primary)" font-size="10" font-weight="700">${count}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${W} ${H}" class="chartbox" role="img" aria-label="Most frequent thinking traps">${rows}</svg>`;
}
