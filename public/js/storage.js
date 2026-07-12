// public/js/storage.js
//
// Since the hackathon rules forbid a database, ALL persistence (collections,
// environments, request history) lives in the browser's localStorage.
// This file is the ONLY place that touches `localStorage` directly -- every
// other module reads/writes through these functions. That way, if we ever
// swap localStorage for IndexedDB, only this file changes.

const STORAGE_KEYS = {
  COLLECTIONS: "pmlite_collections",
  ENVIRONMENTS: "pmlite_environments",
  ACTIVE_ENV: "pmlite_active_env",
  HISTORY: "pmlite_history",
};

// Cap history length so localStorage doesn't grow unbounded over time.
const MAX_HISTORY_ENTRIES = 50;

const Storage = {
  // Generic get/set with JSON parsing built in.
  get(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // ---- Collections ----
  getCollections() {
    return this.get(STORAGE_KEYS.COLLECTIONS, []);
  },
  saveCollections(collections) {
    this.set(STORAGE_KEYS.COLLECTIONS, collections);
  },

  // ---- Environments ----
  getEnvironments() {
    return this.get(STORAGE_KEYS.ENVIRONMENTS, []);
  },
  saveEnvironments(environments) {
    this.set(STORAGE_KEYS.ENVIRONMENTS, environments);
  },

  getActiveEnvId() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ENV) || "";
  },
  setActiveEnvId(id) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ENV, id);
  },

  // ---- History ----
  // Each entry: { id, method, url, timestamp }
  // Newest entries are kept at the FRONT of the array so the list renders
  // most-recent-first with no extra sorting needed.
  getHistory() {
    return this.get(STORAGE_KEYS.HISTORY, []);
  },

  addHistoryEntry(method, url) {
    const history = this.getHistory();
    history.unshift({
      id: generateId("hist"),
      method,
      url,
      timestamp: Date.now(),
    });
    // Trim to the cap.
    const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);
    this.set(STORAGE_KEYS.HISTORY, trimmed);
  },

  clearHistory() {
    this.set(STORAGE_KEYS.HISTORY, []);
  },
};

// A small helper to generate reasonably-unique IDs without a DB auto-increment.
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}
