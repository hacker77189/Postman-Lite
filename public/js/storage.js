// Everything lives in localStorage — no database per hackathon rules.
// All modules go through these helpers, so switching to IndexedDB later
// only changes this one file.

const STORE = {
  COLLECTIONS: "pmlite_collections",
  ENVIRONMENTS: "pmlite_environments",
  ACTIVE_ENV: "pmlite_active_env",
  HISTORY: "pmlite_history",
};

// Stop history from eating up localStorage (~5MB limit per origin).
const MAX_HISTORY = 50;

const Storage = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

  getCollections() { return this.get(STORE.COLLECTIONS, []); },
  saveCollections(c) { this.set(STORE.COLLECTIONS, c); },

  getEnvironments() { return this.get(STORE.ENVIRONMENTS, []); },
  saveEnvironments(e) { this.set(STORE.ENVIRONMENTS, e); },

  getActiveEnvId() { return localStorage.getItem(STORE.ACTIVE_ENV) || ""; },
  setActiveEnvId(id) { localStorage.setItem(STORE.ACTIVE_ENV, id); },

  getHistory() { return this.get(STORE.HISTORY, []); },

  addHistoryEntry(method, url) {
    const h = this.getHistory();
    h.unshift({ id: generateId("hist"), method, url, timestamp: Date.now() });
    this.set(STORE.HISTORY, h.slice(0, MAX_HISTORY));
  },

  clearHistory() { this.set(STORE.HISTORY, []); },
};

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
