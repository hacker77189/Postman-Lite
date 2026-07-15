// Tab bar — each open request or env editor lives in its own tab.

const TabsManager = {
  tabs: [], activeId: null,

  init() {
    this.newUntitled();
    const bar = document.getElementById("tabsBar");
    bar.addEventListener("wheel", e => {
      if (bar.scrollWidth > bar.clientWidth) { e.preventDefault(); bar.scrollLeft += e.deltaY; }
    }, { passive: false });
  },

  newUntitled() {
    const id = generateId("tab");
    this.tabs.push({ id, type: "request", method: "GET", name: "Untitled", request: RequestBuilder.getCurrentRequest() });
    this.activeId = id;
    showMainContent("request");
    this.render();
  },

  openNew() {
    this.saveCurrent();
    const empty = { method: "GET", url: "", params: [], headers: [], bodyMode: "none", bodyRaw: "", bodyFields: [], auth: { type: "none" } };
    const id = generateId("tab");
    this.tabs.push({ id, type: "request", method: "GET", name: "Untitled", request: empty });
    this.activeId = id;
    showMainContent("request");
    RequestBuilder.loadRequest(empty);
    this.render();
    this.scrollEnd();
  },

  openTab(method, name, data, switchTo) {
    this.saveCurrent();
    const id = generateId("tab");
    this.tabs.push({ id, type: "request", method, name, request: JSON.parse(JSON.stringify(data)) });
    if (switchTo !== false) {
      this.activeId = id;
      showMainContent("request");
      RequestBuilder.loadRequest(data);
    }
    this.render();
    this.scrollEnd();
  },

  openEnv(envId, envName) {
    this.saveCurrent();
    const exist = this.tabs.find(t => t.type === "environment" && t.envId === envId);
    if (exist) { this.switch(exist.id); return; }
    const id = generateId("tab");
    this.tabs.push({ id, type: "environment", envId, method: "", name: `Env: ${envName}` });
    this.activeId = id;
    showMainContent("environment");
    renderEnvEditor(envId);
    this.render();
    this.scrollEnd();
  },

  saveResponse(data) {
    const tab = this.tabs.find(t => t.id === this.activeId);
    if (tab && tab.type === "request") tab.lastResponse = data;
  },

  switch(id) {
    if (id === this.activeId) return;
    this.saveCurrent();
    this.activeId = id;
    const tab = this.tabs.find(t => t.id === id);
    if (!tab) { this.render(); return; }
    if (tab.type === "environment") { showMainContent("environment"); renderEnvEditor(tab.envId); }
    else { showMainContent("request"); RequestBuilder.loadRequest(tab.request); if (tab.lastResponse) ResponseViewer.render(tab.lastResponse); }
    this.render();
  },

  close(id) {
    if (this.tabs.length <= 1) return;
    const idx = this.tabs.findIndex(t => t.id === id);
    if (idx < 0) return;
    this.tabs.splice(idx, 1);
    if (this.activeId === id) this.switch(this.tabs[Math.min(idx, this.tabs.length - 1)].id);
    this.render();
  },

  saveCurrent() {
    if (!this.activeId) return;
    const tab = this.tabs.find(t => t.id === this.activeId);
    if (tab?.type === "request") tab.request = RequestBuilder.getCurrentRequest();
  },

  render() {
    const bar = document.getElementById("tabsBar");
    bar.innerHTML = "";
    if (!this.tabs.length) { bar.innerHTML = '<div style="padding:0 12px;font-size:12px;color:var(--text-secondary);line-height:36px;">No open tabs</div>'; return; }

    this.tabs.forEach(tab => {
      const el = document.createElement("div");
      el.className = `request-tab${tab.id === this.activeId ? " active" : ""}`;
      el.dataset.tabId = tab.id;
      const dot = tab.type === "environment" ? "var(--accent)" : getMethodColor(tab.method);
      el.innerHTML = `<span class="tab-method-dot" style="background:${dot}"></span><span class="tab-name">${escapeHtml(tab.name)}</span><button class="tab-close" data-tab-id="${tab.id}">&times;</button>`;

      el.querySelector(".tab-name").addEventListener("dblclick", e => {
        e.stopPropagation();
        const inp = document.createElement("input");
        inp.className = "tab-name-input";
        inp.value = tab.name;
        inp.style.width = Math.max(60, tab.name.length * 9) + "px";
        e.target.replaceWith(inp); inp.focus(); inp.select();
        const done = () => { const v = inp.value.trim(); if (v && v !== tab.name) tab.name = v; this.render(); };
        inp.addEventListener("blur", done);
        inp.addEventListener("keydown", e => {
          if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
          if (e.key === "Escape") { inp.value = tab.name; inp.blur(); }
        });
      });

      el.addEventListener("click", e => { if (!e.target.closest(".tab-close, input")) this.switch(tab.id); });
      el.querySelector(".tab-close").addEventListener("click", e => { e.stopPropagation(); this.close(tab.id); });
      bar.appendChild(el);
    });

    const add = document.createElement("button");
    add.className = "tab-add-btn"; add.textContent = "+"; add.title = "New tab";
    add.addEventListener("click", () => this.openNew());
    bar.appendChild(add);
  },

  scrollEnd() { setTimeout(() => { document.getElementById("tabsBar").scrollLeft = 1e9; }, 10); },
};
