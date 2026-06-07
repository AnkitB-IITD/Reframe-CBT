/* Lock — PIN gate shown on launch when an app lock is set.
   Tries native biometrics first (Capacitor), then falls back to PIN. */
import { icon, h, on, sha256, haptic } from '../ui.js';

export function runLock(pinHash) {
  return new Promise(async (resolve) => {
    // Native biometric unlock, if available.
    try {
      const cap = window.Capacitor;
      const Bio = cap?.Plugins?.NativeBiometric;
      if (Bio) {
        const avail = await Bio.isAvailable();
        if (avail && avail.isAvailable) {
          await Bio.verifyIdentity({ reason: 'Unlock Reframe', title: 'Reframe' });
          return resolve(); // verifyIdentity throws if it fails
        }
      }
    } catch { /* fall through to PIN */ }

    let entry = '';
    const fs = h('<div class="fs"><div class="lock"></div></div>');
    const lock = fs.querySelector('.lock');

    function render() {
      lock.innerHTML = `
        ${icon('lock', 56)}
        <h2>Enter your PIN</h2>
        <div class="lock__dots">
          ${[0, 1, 2, 3].map((k) => `<span class="lock__dot" data-on="${k < entry.length}"></span>`).join('')}
        </div>
        <div class="keypad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
          <button class="key--blank"></button>
          <button data-k="0">0</button>
          <button data-del aria-label="Delete">${icon('back', 22)}</button>
        </div>`;
    }

    async function press(d) {
      if (entry.length >= 4) return;
      entry += d; haptic('light'); render();
      if (entry.length === 4) {
        if (await sha256(entry) === pinHash) { haptic('success'); fs.remove(); resolve(); }
        else {
          haptic('warning');
          lock.classList.add('is-wrong');
          setTimeout(() => { entry = ''; lock.classList.remove('is-wrong'); render(); }, 450);
        }
      }
    }

    on(fs, 'click', '[data-k]', (e, el) => press(el.dataset.k));
    on(fs, 'click', '[data-del]', () => { entry = entry.slice(0, -1); render(); });
    document.addEventListener('keydown', (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') { entry = entry.slice(0, -1); render(); }
    });

    render();
    document.body.appendChild(fs);
  });
}
