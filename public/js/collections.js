// Collection tree with inline create, rename, delete, and real-time search.

const Collections = {
  expanded: {},

  create(name) {
    const all = Storage.getCollections();
    const c = { id: generateId("col"), name, requests: [] };
    all.push(c);
    Storage.saveCollections(all);
    return c;
  },

  renameCollection(id, name) {
    const all = Storage.getCollections();
    const c = all.find(x => x.id === id);
    if (c) { c.name = name; Storage.saveCollections(all); }
  },

  deleteCollection(id) {
    if (!confirm("Delete this collection and all its requests?")) return;
    Storage.saveCollections(Storage.getCollections().filter(c => c.id !== id));
    TabsManager.tabs.forEach(t => {
      if (t.colId === id) { t.colId = null; t.reqId = null; }
    });
    TabsManager.updateSaveBtn();
    this.renderList();
  },

  addRequestToCollection(colId, name, req) {
    const all = Storage.getCollections();
    const c = all.find(x => x.id === colId);
    if (c) {
      const r = { id: generateId("req"), name, request: req };
      c.requests.push(r);
      Storage.saveCollections(all);
      return r;
    }
    return null;
  },

  renameRequest(colId, reqId, name) {
    const all = Storage.getCollections();
    const c = all.find(x => x.id === colId);
    const r = c?.requests.find(x => x.id === reqId);
    if (r) { r.name = name; Storage.saveCollections(all); }
  },

  deleteRequest(colId, reqId) {
    if (!confirm("Delete this request?")) return;
    const all = Storage.getCollections();
    const c = all.find(x => x.id === colId);
    if (c) { c.requests = c.requests.filter(r => r.id !== reqId); Storage.saveCollections(all); }
    TabsManager.tabs.forEach(t => {
      if (t.colId === colId && t.reqId === reqId) { t.colId = null; t.reqId = null; }
    });
    TabsManager.updateSaveBtn();
    this.renderList();
  },

  findRequest(colId, reqId) {
    return Storage.getCollections().find(c => c.id === colId)?.requests.find(r => r.id === reqId) || null;
  },

  renderList(searchFilter) {
    const el = document.getElementById("collectionsList");
    const cols = Storage.getCollections();
    const self = this;
    el.innerHTML = "";

    if (!cols.length) {
      el.innerHTML = '<div class="history-empty">No collections yet.</div>';
      return;
    }

    cols.forEach(col => {
      if (!(col.id in self.expanded)) self.expanded[col.id] = true;
      const open = self.expanded[col.id];

      const filter = searchFilter?.toLowerCase();
      const match = filter
        ? col.requests.filter(r =>
            r.name.toLowerCase().includes(filter) ||
            (r.request.method || "").toLowerCase().includes(filter) ||
            (r.request.url || "").toLowerCase().includes(filter)
          )
        : col.requests;

      if (filter && !col.name.toLowerCase().includes(filter) && !match.length) return;

      const wrap = document.createElement("div");
      wrap.className = "collection-item";

      // Collection header row.
      const hdr = document.createElement("div");
      hdr.className = `collection-name${open ? " expanded" : ""}`;
      hdr.innerHTML = `<span class="toggle-arrow">▶</span><span class="coll-name-text">${escapeHtml(col.name)}</span>
        <button class="coll-add-req-btn" title="Add request">+</button>
        <button class="coll-delete-btn" title="Delete collection">×</button>`;
      hdr.querySelector(".toggle-arrow").after(hdr.querySelector(".coll-name-text"));

      hdr.querySelector(".coll-add-req-btn").addEventListener("click", e => {
        e.stopPropagation();
        showNewRequestRow(wrap, col.id, searchFilter);
      });
      hdr.querySelector(".coll-delete-btn").addEventListener("click", e => {
        e.stopPropagation(); self.deleteCollection(col.id);
      });

      // Double-click to rename collection.
      hdr.querySelector(".coll-name-text").addEventListener("dblclick", e => {
        e.stopPropagation();
        const inp = document.createElement("input");
        inp.className = "inline-rename-input";
        inp.value = col.name;
        const span = e.target;
        span.replaceWith(inp); inp.focus(); inp.select();
        const done = () => {
          const v = inp.value.trim();
          if (v && v !== col.name) self.renameCollection(col.id, v);
          self.renderList(searchFilter);
        };
        inp.addEventListener("blur", done);
        inp.addEventListener("keydown", e => {
          if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
          if (e.key === "Escape") { inp.value = col.name; inp.blur(); }
        });
      });

      hdr.addEventListener("click", e => {
        if (e.target.closest("button, input")) return;
        self.expanded[col.id] = !self.expanded[col.id];
        self.renderList(searchFilter);
      });
      wrap.appendChild(hdr);

      // Inline "new request" row (hidden by default).
      const newRow = document.createElement("div");
      newRow.className = "inline-create-row";
      newRow.style.display = "none";
      newRow.innerHTML = `<input type="text" class="new-req-name-input" placeholder="Request name" />
        <button class="btn-small btn-confirm">✓</button>
        <button class="btn-small btn-cancel">✕</button>`;
      wrap.appendChild(newRow);

      // Request list.
      if (open) {
        const rw = document.createElement("div");
        rw.className = "collection-requests";

        if (!match.length) {
          const empty = document.createElement("div");
          empty.className = "history-empty";
          empty.style.marginLeft = "12px";
          empty.textContent = filter ? "No matching requests." : "No saved requests yet.";
          rw.appendChild(empty);
        }

        match.forEach(sr => {
          const ri = document.createElement("div");
          ri.className = "request-item";
          ri.innerHTML = `<span class="method-badge method-${sr.request.method || "GET"}">${sr.request.method || "GET"}</span>
            <span class="req-name-text">${escapeHtml(sr.name)}</span>
            <button class="req-delete-btn" title="Delete request">×</button>`;

          ri.querySelector(".req-delete-btn").addEventListener("click", e => {
            e.stopPropagation(); self.deleteRequest(col.id, sr.id);
          });

          // Double-click to rename request.
          ri.querySelector(".req-name-text").addEventListener("dblclick", e => {
            e.stopPropagation();
            const inp = document.createElement("input");
            inp.className = "inline-rename-input";
            inp.value = sr.name;
            const span = e.target;
            span.replaceWith(inp); inp.focus(); inp.select();
            const done = () => {
              const v = inp.value.trim();
              if (v && v !== sr.name) self.renameRequest(col.id, sr.id, v);
              self.renderList(searchFilter);
            };
            inp.addEventListener("blur", done);
            inp.addEventListener("keydown", e => {
              if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
              if (e.key === "Escape") { inp.value = sr.name; inp.blur(); }
            });
          });

          ri.addEventListener("click", e => {
            if (e.target.closest("button, input")) return;
            TabsManager.openTab(sr.request.method || "GET", sr.name, sr.request, true, col.id, sr.id);
          });
          rw.appendChild(ri);
        });
        wrap.appendChild(rw);
      }
      el.appendChild(wrap);
    });
  },
};

// Collection search — just filters and re-renders.
const CollectionSearch = {
  init() {
    document.getElementById("collectionSearch").addEventListener("input", e => {
      Collections.renderList(e.target.value.trim().toLowerCase());
    });
  },
};

function showNewRequestRow(wrapper, colId, filter) {
  const row = wrapper.querySelector(".inline-create-row");
  if (!row) return;
  row.style.display = "flex";
  const inp = row.querySelector(".new-req-name-input");
  inp.value = ""; inp.focus();
  const ok = () => {
    const name = inp.value.trim() || "New Request";
    const empty = { method: "GET", url: "", params: [], headers: [], bodyMode: "none", bodyRaw: "", bodyFields: [], auth: { type: "none" } };
    const saved = Collections.addRequestToCollection(colId, name, empty);
    if (saved) TabsManager.openTab("GET", name, empty, true, colId, saved.id);
    else TabsManager.openTab("GET", name, empty);
    row.style.display = "none";
    Collections.renderList(filter);
  };
  const cancel = () => { row.style.display = "none"; };
  row.querySelector(".btn-confirm").onclick = ok;
  row.querySelector(".btn-cancel").onclick = cancel;
  inp.onkeydown = e => {
    if (e.key === "Enter") ok();
    if (e.key === "Escape") cancel();
  };
}
