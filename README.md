# Reframe — CBT 7-Column Thought Record

A private, gentle, **offline-first** thought-record app for working through the
classic Cognitive Behavioural Therapy 7-column exercise. Built **Android-first**
as a zero-build web app that runs instantly in a browser **and** wraps cleanly
into a native Android (later iOS) app via **Capacitor**.

> Designed from scratch as a fresh take — it does **not** share code with the
> earlier `thought-record-app`.

---

## Why it's built this way

This app was shaped by a product review of a first-generation version. The key
decisions:

| Decision | Reason |
|---|---|
| **IndexedDB**, not `localStorage` | `localStorage` is synchronous, ~5 MB, and is evicted by iOS/Android under storage pressure — unacceptable for a journal people trust. IndexedDB is async, durable, and we also call `navigator.storage.persist()`. |
| **Capacitor wrapper** | A raw PWA isn't a real Play Store / App Store app (throttled APIs, no reliable notifications on iOS). Capacitor keeps 100% of this code and adds native storage, biometrics, notifications, and a share sheet. |
| **Capture-first flow + resumable drafts** | A distressed user shouldn't be forced through 7 mandatory steps. Only situation, moods, the hot thought, and the balanced thought are required; *evidence-for* and *re-rate* are optional. Every step autosaves to IndexedDB. |
| **Crisis resources, always reachable** | A safety baseline for any mental-health app (and an app-store expectation). Lifebuoy in the header → crisis lines + grounding exercise. |
| **PIN / biometric app lock** | These are someone's most private thoughts. PIN works on the web; the installed app upgrades to fingerprint/Face via `capacitor-native-biometric`. |
| **`rem` units, reduced-motion, ARIA** | Respects OS text scaling and accessibility settings — disproportionately important for this audience. |
| **`dvh` + safe-area insets + sticky footers** | Survives the mobile keyboard and notches that break typical web layouts. |

---

## Run it (web / development)

```bash
cd reframe-cbt
npm run dev          # serves on http://localhost:4180 and opens a browser
```

No build step, no dependencies to install for the web app — it's plain ES modules.
A service worker caches the shell, so after the first load it works fully offline.

---

## App icons

The launcher/PWA icons are generated from `icon.svg` into `icons/*.png`:

```bash
npm install            # (once) pulls sharp
npm run icons          # writes icons/icon-192.png, icon-512.png, maskable-*, etc.
```

The manifest and `index.html` already reference these PNGs (with the SVG as a
scalable fallback). For native launcher icons/splash, `npx @capacitor/assets generate`
uses `icons/icon-1024.png`.

## Ship it to Android (Capacitor)

Requires Node, Android Studio, and a JDK. The web app lives at the project root
for zero-build dev; `npm run build:web` assembles a clean `www/` bundle (free of
`node_modules`) that Capacitor wraps — `webDir` points at `www`.

```bash
cd reframe-cbt
npm install                       # Capacitor CLI + android + tooling
npm run cap:add:android           # build:web → creates the native android/ project
npm run cap:open:android          # opens Android Studio → Run / build APK/AAB
# after any web change:
npm run cap:sync                  # rebuilds www/ and copies it into the shell
```

These native plugins are **installed and registered** with the Android project,
and the app already feature-detects each one (falling back gracefully on web):

- `@capacitor/haptics` — real haptic feedback (`ui.js`)
- `@capacitor/share` — native share sheet for exports (`ui.js`)
- `@capacitor/local-notifications` — the daily reminder (`settings.js` → `applyReminder`)
- `capacitor-native-biometric` — fingerprint/Face unlock, falls back to PIN (`views/lock.js`)

Optional, not yet installed:

- `@capacitor-community/sqlite` — swap the IndexedDB backend for native SQLite (reimplement `db.js` only)

iOS later: `npx cap add ios` — the same web code runs unchanged.

---

## Architecture

```
index.html            # minimal shell + boot splash
manifest.webmanifest  # installable PWA metadata
sw.js                 # offline app-shell cache
icon.svg / icon-maskable.svg
icons/                # generated PNG icons (npm run icons)
capacitor.config.json
scripts/
  generate-icons.mjs  # svg → png launcher/PWA icons (sharp)
  sync-web.mjs        # assembles a clean www/ bundle for Capacitor
android/              # generated native project (npm run cap:add:android)
styles/
  tokens.css          # design tokens (color, type, spacing) — light + dark
  app.css             # components & layout
  print.css           # 7-column "share with therapist" worksheet
src/
  app.js              # bootstrap, shell, theme, onboarding/lock gates, nav
  router.js           # tiny in-memory view router
  db.js               # IndexedDB repository  ← single storage seam
  content.js          # copy & data (emotions, traps, crisis, steps, learn, research)
  ui.js               # DOM helpers, icons, toast, modal, haptics, share, sha256
  insights.js         # metrics + dependency-free SVG charts
  views/
    home.js  wizard.js  history.js  detail.js
    insights-view.js  settings.js  crisis.js
    learn.js          # CBT primer, replay-intro, research links
    onboarding.js  lock.js
```

**Storage is isolated to `db.js`.** To move to native SQLite, reimplement that
one module against `@capacitor-community/sqlite`; nothing else changes.

### Record shape
```js
{
  id, status: 'draft' | 'complete', createdAt, updatedAt,
  date,                                   // when the situation happened (ISO)
  situation,
  moods: [{ name, pre, post }],           // ordered; supports custom emotions
  thoughts, hotThought, distortions: [key],
  evidenceFor, evidenceAgainst,
  balancedThought, balancedBelief,        // 0–100
  outcome, lastStep                       // lastStep = resume point for drafts
}
```

---

## Privacy

No account, no network calls, no analytics. Records never leave the device.
Export (JSON/CSV) and import are manual and user-initiated. The PIN is stored
only as a SHA-256 hash.

## Disclaimer

Reframe is a self-help tool, not a substitute for professional care. If you’re
struggling, please contact a qualified professional or a crisis line.

## License

MIT
