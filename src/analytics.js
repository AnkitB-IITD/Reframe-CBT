/* ============================================================
   analytics.js — Privacy-first, anonymous usage analytics (Aptabase).

   Principles for a mental-health app:
   • NEVER sends thought content, record fields, or any personal data —
     only event names like 'record_completed' and coarse counts.
   • No cookies, no advertising IDs, no cross-site identifiers.
   • Disabled entirely until you set APTABASE_APP_KEY below.
   • Honours the in-app opt-out toggle AND the browser's Do-Not-Track.

   Talks to the Aptabase ingest REST API directly, so there's no SDK /
   build step and the app stays a zero-dependency PWA.
   Get a free app key at https://aptabase.com (or self-host).
   ============================================================ */
import { db } from './db.js';

// ↓↓↓ Paste your Aptabase app key here after signing up, e.g. 'A-US-1234567890'.
//     Leave empty to keep analytics completely off.
export const APTABASE_APP_KEY = '';
// Only needed for self-hosted Aptabase (keys starting 'A-SH-').
const APTABASE_SELF_HOST = '';

const APP_VERSION = '1.0.0';
const SESSION_TTL = 60 * 60 * 1000; // a session expires after 1h idle

let enabled = false;
let sessionId = null;
let sessionExpires = 0;

function hostFor(key) {
  const region = (key.split('-')[1] || '').toUpperCase();
  if (region === 'US') return 'https://us.aptabase.com';
  if (region === 'EU') return 'https://eu.aptabase.com';
  return APTABASE_SELF_HOST || null; // SH / DEV → self-host URL
}

function session() {
  const now = Date.now();
  if (!sessionId || now > sessionExpires) {
    sessionId = (crypto.randomUUID && crypto.randomUUID()) || (now + '-' + Math.random().toString(36).slice(2));
  }
  sessionExpires = now + SESSION_TTL;
  return sessionId;
}

function systemProps() {
  const ua = navigator.userAgent || '';
  const native = !!window.Capacitor;
  const os = native
    ? (window.Capacitor.getPlatform ? window.Capacitor.getPlatform() : 'android')
    : (/android/i.test(ua) ? 'Android' : /iphone|ipad|ipod/i.test(ua) ? 'iOS' : /windows/i.test(ua) ? 'Windows' : /mac/i.test(ua) ? 'macOS' : 'Web');
  return {
    isDebug: location.hostname === 'localhost' || location.protocol === 'file:',
    locale: navigator.language || 'en',
    appVersion: APP_VERSION,
    appBuildNumber: '1',
    sdkVersion: 'reframe-mini@1.0.0',
    osName: os,
    osVersion: '',
    engineName: '',
    engineVersion: '',
    deviceModel: native ? 'native' : 'web'
  };
}

/** Read prefs and decide whether tracking is allowed this session. */
export async function initAnalytics() {
  if (!APTABASE_APP_KEY) { enabled = false; return; }
  const dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1';
  const optedOut = await db.getMeta('analyticsOptOut', false);
  enabled = !dnt && !optedOut;
}

/** Toggle from Settings. Persists the choice. */
export async function setAnalyticsEnabled(on) {
  await db.setMeta('analyticsOptOut', !on);
  const dnt = navigator.doNotTrack === '1';
  enabled = !!on && !!APTABASE_APP_KEY && !dnt;
}

export function analyticsEnabled() { return enabled; }

/** Fire-and-forget. Never throws, never blocks the UI. `props` must be
 *  non-sensitive (strings/numbers/bools only) — no record content. */
export function track(eventName, props) {
  if (!enabled || !APTABASE_APP_KEY) return;
  const host = hostFor(APTABASE_APP_KEY);
  if (!host) return;
  try {
    fetch(host + '/api/v0/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'App-Key': APTABASE_APP_KEY },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        sessionId: session(),
        eventName,
        systemProps: systemProps(),
        props: props || {}
      }),
      keepalive: true
    }).catch(() => {});
  } catch { /* swallow — analytics must never break the app */ }
}
