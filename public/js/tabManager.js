// public/js/tabManager.js
//
// Manages the request tab bar: opening, closing, switching between request
// tabs and environment editor tabs. Each tab stores its own request state.
//
const TabsManager = {
  tabs: [],
  activeTabId: null,

  init() {
    this.openUntitledTab();
    const bar = document.getElementById("tabsBar");
    bar.addEventListener("wheel", (e) => {
      if (bar.scrollWidth > bar.clientWidth) {
        e.preventDefault();
        bar.scrollLeft += e.deltaY;
      }
    }, { passive: false });
  },

  openUntitledTab() {
    const id = generateId("tab");
    const request = RequestBuilder.getCurrentRequest();
    this.tabs.push({ id, type: "request", method: "GET", name: "Untitled", request });
    this.activeTabId = id;
    showMainContent("request");
    this.renderTabs();
  },

  openNewTab() {
    this.saveCurrentState();
    const emptyReq = { method: "GET", url: "", params: [], headers: [], bodyMode: "none", bodyRaw: "", bodyFields: [], auth: { type: "none" } };
    const id = generateId("tab");
    this.tabs.push({ id, type: "request", method: "GET", name: "Untitled", request: emptyReq });
    this.activeTabId = id;
    showMainContent("request");
    RequestBuilder.loadRequest(emptyReq);
    this.renderTabs();
    this.scrollToEnd();
  },

  openTab(method, name, requestData, switchTo) {
    this.saveCurrentState();
    const id = generateId("tab");
    this.tabs.push({ id, type: "request", method, name, request: JSON.parse(JSON.stringify(requestData)) });
    if (switchTo !== false) {
      this.activeTabId = id;
      showMainContent("request");
      RequestBuilder.loadRequest(requestData);
    }
    this.renderTabs();
    this.scrollToEnd();
  },

  openEnvTab(envId, envName) {
    this.saveCurrentState();
    const existing = this.tabs.find((t) => t.type === "environment" && t.envId === envId);
    if (existing) {
      this.switchTab(existing.id);
      return;
    }
    const id = generateId("tab");
    this.tabs.push({ id, type: "environment", envId, method: "", name: `Env: ${envName}` });
    this.activeTabId = id;
    showMainContent("environment");
    renderEnvEditor(envId);
    this.renderTabs();
    this.scrollToEnd();
  },

  switchTab(id) {
    if (id === this.activeTabId) return;
    this.saveCurrentState();
    this.activeTabId = id;
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      if (tab.type === "environment") {
        showMainContent("environment");
        renderEnvEditor(tab.envId);
      } else {
        showMainContent("request");
        RequestBuilder.loadRequest(tab.request);
      }
    }
    this.renderTabs();
  },

  closeTab(id) {
    if (this.tabs.length <= 1) return;
    const idx = this.tabs.findIndex((t) => t.id === id);
    if (idx === -1) return;
    const closedTab = this.tabs[idx];
    this.tabs.splice(idx, 1);
    if (this.activeTabId === id) {
      const newIdx = Math.min(idx, this.tabs.length - 1);
      this.switchTab(this.tabs[newIdx].id);
    }
    this.renderTabs();
  },

  saveCurrentState() {
    if (!this.activeTabId) return;
    const tab = this.tabs.find((t) => t.id === this.activeTabId);
    if (!tab) return;
    if (tab.type === "request") {
      tab.request = RequestBuilder.getCurrentRequest();
    }
  },

  renderTabs() {
    const bar = document.getElementById("tabsBar");
    bar.innerHTML = "";
    if (!this.tabs.length) {
      bar.innerHTML = '<div style="padding:0 12px;font-size:12px;color:var(--text-secondary);line-height:36px;">No open tabs</div>';
      return;
    }
    this.tabs.forEach((tab) => {
      const el = document.createElement("div");
      el.className = `request-tab${tab.id === this.activeTabId ? " active" : ""}`;
      el.dataset.tabId = tab.id;

      if (tab.type === "environment") {
        el.innerHTML = `
          <span class="tab-method-dot" style="background:var(--accent)"></span>
          <span class="tab-name">${escapeHtml(tab.name)}</span>
          <button class="tab-close" data-tab-id="${tab.id}">&times;</button>
        `;
      } else {
        el.innerHTML = `
          <span class="tab-method-dot" style="background:${getMethodColor(tab.method)}"></span>
          <span class="tab-name">${escapeHtml(tab.name)}</span>
          <button class="tab-close" data-tab-id="${tab.id}">&times;</button>
        `;
      }

      const nameSpan = el.querySelector(".tab-name");
      nameSpan.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const input = document.createElement("input");
        input.className = "tab-name-input";
        input.value = tab.name;
        input.style.width = Math.max(60, tab.name.length * 9) + "px";
        nameSpan.replaceWith(input);
        input.focus();
        input.select();
        const finish = () => {
          const val = input.value.trim();
          if (val && val !== tab.name) {
            tab.name = val;
          }
          this.renderTabs();
        };
        input.addEventListener("blur", finish);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); input.blur(); }
          if (e.key === "Escape") { input.value = tab.name; input.blur(); }
        });
      });

      el.addEventListener("click", (e) => {
        if (e.target.closest(".tab-close")) return;
        if (e.target.closest("input")) return;
        this.switchTab(tab.id);
      });
      el.querySelector(".tab-close").addEventListener("click", (e) => {
        e.stopPropagation();
        this.closeTab(tab.id);
      });
      bar.appendChild(el);
    });

    const addBtn = document.createElement("button");
    addBtn.className = "tab-add-btn";
    addBtn.textContent = "+";
    addBtn.title = "New tab";
    addBtn.addEventListener("click", () => this.openNewTab());
    bar.appendChild(addBtn);
  },

  scrollToEnd() {
    setTimeout(() => {
      const bar = document.getElementById("tabsBar");
      bar.scrollLeft = bar.scrollWidth;
    }, 10);
  },
};
