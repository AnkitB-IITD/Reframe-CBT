/* ============================================================
   entitlement.js — Monetisation foundation (free now, Pro later).

   Right now LAUNCH_FREE = true, so EVERY feature is unlocked for
   everyone and nothing is gated. The plumbing below means that when
   you're ready to introduce "Reframe Pro" you only:
     1) set LAUNCH_FREE = false,
     2) wrap Pro-only features in `if (await isPro()) { ... }`,
     3) call startTrial() on first run and wire a real purchase
        (Google Play Billing) into markPurchased().

   The 15-day free trial is handled locally here for a frictionless
   "try before you buy". For a store-grade trial you can alternatively
   configure a 15-day free trial directly on a Play subscription — see
   README › Monetisation.
   ============================================================ */
import { db } from './db.js';

const LAUNCH_FREE = true;     // ← flip to false when Pro ships
export const TRIAL_DAYS = 15;

// Features that WILL become Pro later (kept here as the single source of
// truth; everything is free while LAUNCH_FREE is true).
export const PRO_FEATURES = [
  'cloud_backup',       // encrypted off-device sync
  'advanced_insights',  // deeper trends, exports
  'pdf_export',         // styled therapist PDF
  'custom_reminders',   // multiple / smart reminders
  'extra_exercises',    // beyond the thought record
  'themes'              // extra colour themes
];

const DAY = 86400000;

/** Returns { status, pro, trialDaysLeft }.
 *  status: 'free-all' | 'pro' | 'trial' | 'expired' | 'free' */
export async function getEntitlement() {
  if (LAUNCH_FREE) return { status: 'free-all', pro: true, trialDaysLeft: 0 };

  const ent = (await db.getMeta('entitlement', null)) || {};
  if (ent.status === 'pro') return { status: 'pro', pro: true, trialDaysLeft: 0 };

  if (ent.trialStartedAt) {
    const used = Math.floor((Date.now() - ent.trialStartedAt) / DAY);
    const left = TRIAL_DAYS - used;
    if (left > 0) return { status: 'trial', pro: true, trialDaysLeft: left };
    return { status: 'expired', pro: false, trialDaysLeft: 0 };
  }
  return { status: 'free', pro: false, trialDaysLeft: TRIAL_DAYS };
}

export async function isPro() {
  return (await getEntitlement()).pro;
}

/** Begin the local 15-day trial (idempotent). */
export async function startTrial() {
  const ent = (await db.getMeta('entitlement', {})) || {};
  if (!ent.trialStartedAt && ent.status !== 'pro') {
    await db.setMeta('entitlement', { ...ent, trialStartedAt: Date.now() });
  }
  return getEntitlement();
}

/** Call after a verified Google Play purchase. */
export async function markPurchased() {
  await db.setMeta('entitlement', { status: 'pro', purchasedAt: Date.now() });
  return getEntitlement();
}
