// public/js/history.js
//
// Renders the "History" section in the sidebar: every request that's been
// sent, most recent first. Clicking an entry loads its method + URL back
// into the request builder (params/headers/body/auth aren't tracked in
// history -- only "what did I send and where", same scope Postman's own
// history view covers at a glance).

const History = {
  renderList() {
    const container = document.getElementById("historyList");
    const entries = Storage.getHistory();

    if (!entries.length) {
      container.innerHTML = '<div class="history-empty">No requests sent yet.</div>';
      return;
    }

    container.innerHTML = "";
    entries.forEach((entry) => {
      const el = document.createElement("div");
      el.className = "history-item";
      el.innerHTML = `
        <span class="history-method">${entry.method}</span>
        <span class="history-time">${this.relativeTime(entry.timestamp)}</span>
        <span class="history-url">${this.escapeHtml(entry.url)}</span>
      `;
      el.addEventListener("click", () => {
        const name = entry.url.split("/").pop().split("?")[0] || "Request";
        if (typeof TabsManager !== "undefined") {
          const requestData = { method: entry.method, url: entry.url, params: [], headers: [], bodyMode: "none", bodyRaw: "", bodyFields: [], auth: { type: "none" } };
          TabsManager.openTab(entry.method, name.charAt(0).toUpperCase() + name.slice(1), requestData);
        } else {
          RequestBuilder.loadFromHistory(entry.method, entry.url);
        }
      });
      container.appendChild(el);
    });
  },

  clear() {
    Storage.clearHistory();
    this.renderList();
  },

  // Converts a timestamp into a short "how long ago" label, e.g. "2m ago".
  relativeTime(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  },

  // Minimal escaping since history URLs are rendered via innerHTML.
  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },
};
