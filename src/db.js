/* ============================================================
   db.js — Durable local storage on IndexedDB.

   Why IndexedDB (not localStorage): it is asynchronous (no main-thread
   jank), far larger, and is *not* the first thing the OS evicts under
   storage pressure — critical for a journal people trust with private
   therapy notes. We also request persistent storage where supported.

   Two object stores:
     records — full + draft thought records, keyed by id
     meta    — settings, PIN hash, onboarding flag, theme, etc.

   When wrapping for native, this module is the single seam to swap for
   @capacitor-community/sqlite. Nothing else in the app touches storage.
   ============================================================ */

const DB_NAME = 'reframe';
const DB_VERSION = 1;
const STORE_RECORDS = 'records';
const STORE_META = 'meta';

let _dbp = null;

function open() {
  if (_dbp) return _dbp;
  _dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(STORE_RECORDS)) {
        const s = idb.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
        s.createIndex('byDate', 'date');
        s.createIndex('byStatus', 'status');
        s.createIndex('byUpdated', 'updatedAt');
      }
      if (!idb.objectStoreNames.contains(STORE_META)) {
        idb.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbp;
}

function tx(store, mode, fn) {
  return open().then((idb) => new Promise((resolve, reject) => {
    const t = idb.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then((v) => { out = v; });
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

function reqP(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function newId() {
  return 'tr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

export const db = {
  /** Ask the browser to keep our data through storage pressure. Best-effort. */
  async requestPersistence() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist();
      }
    } catch { /* ignore */ }
    return false;
  },

  /** All records, newest first by their event date. */
  async all() {
    const list = await tx(STORE_RECORDS, 'readonly', (s) => reqP(s.getAll()));
    return (list || []).sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async completed() {
    return (await this.all()).filter((r) => r.status === 'complete');
  },

  async drafts() {
    return (await this.all()).filter((r) => r.status === 'draft');
  },

  /** The single most-recently-touched draft, if any (for "resume"). */
  async latestDraft() {
    const d = await this.drafts();
    return d.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0] || null;
  },

  async get(id) {
    return tx(STORE_RECORDS, 'readonly', (s) => reqP(s.get(id)));
  },

  /** Insert or update. Stamps id/createdAt/updatedAt. Returns the saved record. */
  async put(record) {
    const now = new Date().toISOString();
    const rec = { ...record };
    if (!rec.id) { rec.id = newId(); rec.createdAt = now; }
    if (!rec.createdAt) rec.createdAt = now;
    rec.updatedAt = now;
    await tx(STORE_RECORDS, 'readwrite', (s) => s.put(rec));
    return rec;
  },

  async remove(id) {
    await tx(STORE_RECORDS, 'readwrite', (s) => s.delete(id));
  },

  async clearRecords() {
    await tx(STORE_RECORDS, 'readwrite', (s) => s.clear());
  },

  // ---- meta / settings ----
  async getMeta(key, fallback = null) {
    const row = await tx(STORE_META, 'readonly', (s) => reqP(s.get(key)));
    return row ? row.value : fallback;
  },

  async setMeta(key, value) {
    await tx(STORE_META, 'readwrite', (s) => s.put({ key, value }));
    return value;
  },

  async clearAll() {
    await tx(STORE_RECORDS, 'readwrite', (s) => s.clear());
    await tx(STORE_META, 'readwrite', (s) => s.clear());
  },

  // ---- backup / restore ----
  // Settings that are safe to include in a backup (never the PIN hash).
  _safeMetaKeys: ['theme', 'reminder', 'onboardingDone', 'customEmotions'],

  /** A complete, portable backup: every record + non-sensitive settings. */
  async exportData() {
    const records = await this.all();
    const settings = {};
    for (const k of this._safeMetaKeys) {
      const v = await this.getMeta(k, undefined);
      if (v !== undefined && v !== null) settings[k] = v;
    }
    return {
      app: 'Unspiral',
      schema: 1,
      exportedAt: new Date().toISOString(),
      counts: { records: records.length },
      records,
      settings
    };
  },

  /** Merge imported records by id. Returns count merged. Tolerant of the
   *  bare-array shape and of the {records:[...]} envelope. */
  async importData(parsed) {
    const incoming = Array.isArray(parsed) ? parsed : (parsed && parsed.records) || [];
    if (!Array.isArray(incoming)) throw new Error('Unrecognised backup format.');

    const valid = incoming.filter((r) => r && typeof r === 'object' && r.situation && r.date);
    if (valid.length === 0) throw new Error('No valid records found in this file.');

    await tx(STORE_RECORDS, 'readwrite', (s) => {
      valid.forEach((r) => {
        if (!r.id) r.id = newId();
        if (!r.status) r.status = 'complete';
        s.put(r);
      });
    });

    // Restore safe settings if present in the backup envelope.
    if (parsed && parsed.settings && typeof parsed.settings === 'object') {
      for (const k of this._safeMetaKeys) {
        if (k in parsed.settings) await this.setMeta(k, parsed.settings[k]);
      }
    }
    return valid.length;
  }
};
