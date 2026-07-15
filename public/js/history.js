// History sidebar — shows recently-sent requests, most recent first.

const History = {
  renderList() {
    const el = document.getElementById("historyList");
    const entries = Storage.getHistory();
    if (!entries.length) {
      el.innerHTML = '<div class="history-empty">No requests sent yet.</div>';
      return;
    }
    el.innerHTML = "";
    entries.forEach(e => {
      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `<span class="history-method">${e.method}</span><span class="history-time">${this.relativeTime(e.timestamp)}</span><span class="history-url">${escapeHtml(e.url)}</span>`;
      item.addEventListener("click", () => {
        const name = e.url.split("/").pop().split("?")[0] || "Request";
        const data = { method: e.method, url: e.url, params: [], headers: [], bodyMode: "none", bodyRaw: "", bodyFields: [], auth: { type: "none" } };
        TabsManager.openTab(e.method, name.charAt(0).toUpperCase() + name.slice(1), data);
      });
      el.appendChild(item);
    });
  },

  clear() { Storage.clearHistory(); this.renderList(); },

  relativeTime(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return "just now";
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
  },
};
