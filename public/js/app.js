// Bootstraps every module on page load.

document.addEventListener("DOMContentLoaded", () => {
  RequestBuilder.init();
  Environments.renderSelector();
  Collections.renderList();
  History.renderList();
  RequestBuilder.showBodyPanel();

  bindTabs();
  bindIconBar();
  bindEnvSidebar();
  bindCollectionControls();
  bindHistoryControls();
  bindSaveBtn();
  DividerResizer.init();
  AutoComplete.init();
  DragDrop.init();
  CollectionSearch.init();
  SidePanelGrip.init();
  TabsManager.init();
});

const METHOD_COLORS = {
  GET: "#4CAF50", POST: "#FF9800", PUT: "#2196F3",
  PATCH: "#CE93D8", DELETE: "#F44336", QUERY: "#00BCD4",
};
function getMethodColor(m) { return METHOD_COLORS[m] || "#aaa"; }

function showMainContent(type) {
  const rp = document.getElementById("requestPanel");
  const dv = document.getElementById("divider");
  const rsp = document.getElementById("responsePanel");
  const env = document.getElementById("envEditorPanel");
  if (type === "environment") {
    rp.style.display = "none"; dv.style.display = "none"; rsp.style.display = "none";
    env.style.display = "flex";
  } else {
    rp.style.display = ""; dv.style.display = ""; rsp.style.display = "";
    env.style.display = "none";
  }
}

// ---- Icon bar ----
function bindIconBar() {
  document.querySelectorAll(".icon-btn[data-panel]").forEach(btn => {
    btn.addEventListener("click", () => {
      const panel = btn.dataset.panel;
      const sp = document.getElementById("sidePanel");

      if (sp.classList.contains("collapsed")) {
        sp.classList.remove("collapsed");
      } else {
        const active = document.querySelector(".side-panel-content.active");
        if (active && active.id === `${panel}-panel`) {
          sp.classList.add("collapsed");
          document.querySelectorAll(".icon-btn[data-panel]").forEach(b => b.classList.remove("active"));
          return;
        }
      }

      document.querySelectorAll(".icon-btn[data-panel]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".side-panel-content").forEach(c => c.classList.remove("active"));
      const target = document.getElementById(`${panel}-panel`);
      if (target) target.classList.add("active");
      if (panel === "environments") renderEnvVars();
    });
  });
}

// ---- Environment editor tab ----
let _editEnvId = null;

function renderEnvEditor(envId) {
  _editEnvId = envId;
  const env = Storage.getEnvironments().find(e => e.id === envId);
  if (!env) return;
  document.getElementById("envEditorName").value = env.name;
  const tb = document.querySelector("#envEditorTable tbody");
  tb.innerHTML = "";
  Object.entries(env.variables).forEach(([k, v]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><input type="text" class="env-ed-key" value="${escapeHtml(k)}" placeholder="KEY" /></td>
      <td><input type="text" class="env-ed-val" value="${escapeHtml(v)}" placeholder="value" /></td>
      <td><button class="remove-row" title="Delete">&times;</button></td>`;
    tr.querySelector(".remove-row").addEventListener("click", () => tr.remove());
    tb.appendChild(tr);
  });

  document.getElementById("addEnvEditorVarBtn").onclick = () => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><input type="text" class="env-ed-key" value="" placeholder="KEY" /></td>
      <td><input type="text" class="env-ed-val" value="" placeholder="value" /></td>
      <td><button class="remove-row" title="Delete">&times;</button></td>`;
    tr.querySelector(".remove-row").addEventListener("click", () => tr.remove());
    document.querySelector("#envEditorTable tbody").appendChild(tr);
    tr.querySelector(".env-ed-key").focus();
  };

  document.getElementById("envEditorSaveBtn").onclick = saveEnvEditor;

  let del = document.getElementById("envEditorDeleteBtn");
  if (!del) {
    del = document.createElement("button");
    del.id = "envEditorDeleteBtn"; del.className = "btn-secondary";
    del.style.color = "#F44336"; del.textContent = "Delete Environment";
    document.querySelector(".env-editor-actions").appendChild(del);
    del.addEventListener("click", () => {
      if (!_editEnvId) return;
      Environments.deleteEnv(_editEnvId);
      TabsManager.tabs = TabsManager.tabs.filter(t => !(t.type === "environment" && t.envId === _editEnvId));
      if (TabsManager.tabs.length) TabsManager.switch(TabsManager.tabs[0].id);
      else showMainContent("request");
      Environments.renderSelector(); renderEnvVars(); TabsManager.render();
    });
  }
}

function saveEnvEditor() {
  if (!_editEnvId) return;
  const envs = Storage.getEnvironments();
  const env = envs.find(e => e.id === _editEnvId);
  if (!env) return;
  env.name = document.getElementById("envEditorName").value.trim() || env.name;
  const vars = {};
  document.querySelectorAll("#envEditorTable tbody tr").forEach(tr => {
    const k = tr.querySelector(".env-ed-key")?.value?.trim();
    const v = tr.querySelector(".env-ed-val")?.value || "";
    if (k) vars[k] = v;
  });
  env.variables = vars;
  Storage.saveEnvironments(envs);
  Environments.renderSelector(); renderEnvVars();
  const tab = TabsManager.tabs.find(t => t.type === "environment" && t.envId === _editEnvId);
  if (tab) { tab.name = `Env: ${env.name}`; TabsManager.render(); }
}

function bindEnvSidebar() {
  document.getElementById("envSelector").addEventListener("change", () => {
    Storage.setActiveEnvId(document.getElementById("envSelector").value);
    renderEnvVars();
  });
  document.getElementById("newEnvBtn").addEventListener("click", () => {
    const env = Environments.create("New Environment");
    Storage.setActiveEnvId(env.id);
    Environments.renderSelector(); renderEnvVars();
    TabsManager.openEnv(env.id, env.name);
  });
  document.getElementById("addEnvVarBtn").style.display = "none";
}

function renderEnvVars() {
  const el = document.getElementById("envVariablesList");
  const envId = Storage.getActiveEnvId();
  el.innerHTML = "";
  if (!envId) { el.innerHTML = '<div class="history-empty">No environment selected.</div>'; return; }

  const env = Storage.getEnvironments().find(e => e.id === envId);
  if (!env) { el.innerHTML = '<div class="history-empty">Environment not found.</div>'; return; }

  const entries = Object.entries(env.variables);
  if (!entries.length) el.innerHTML = '<div class="history-empty">No variables.</div>';
  else entries.forEach(([k, v]) => {
    const item = document.createElement("div");
    item.className = "env-key-item"; item.draggable = true; item.dataset.varKey = k;
    item.innerHTML = `<span class="env-key-name">${escapeHtml(k)}</span><span class="env-key-value">${escapeHtml(v)}</span>`;
    item.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", `{{${k}}}`); e.dataTransfer.effectAllowed = "copy"; });
    el.appendChild(item);
  });

  const edit = document.createElement("button");
  edit.className = "btn-edit-env"; edit.textContent = "Edit Variables";
  edit.addEventListener("click", () => TabsManager.openEnv(env.id, env.name));
  el.appendChild(edit);

  const del = document.createElement("button");
  del.className = "btn-edit-env"; del.style.marginTop = "4px"; del.style.color = "#F44336"; del.textContent = "Delete Environment";
  del.addEventListener("click", () => {
    const id = Storage.getActiveEnvId();
    if (!id) return;
    Environments.deleteEnv(id);
    TabsManager.tabs = TabsManager.tabs.filter(t => !(t.type === "environment" && t.envId === id));
    if (TabsManager.activeId && !TabsManager.tabs.find(t => t.id === TabsManager.activeId)) {
      TabsManager.activeId = TabsManager.tabs.length ? TabsManager.tabs[0].id : null;
    }
    Environments.renderSelector(); renderEnvVars(); TabsManager.render();
  });
  el.appendChild(del);
}

// ---- Config/response tab switching ----
function bindTabs() {
  document.querySelectorAll(".tabs-row").forEach(group => {
    const btns = group.querySelectorAll(".tab-btn");
    const panels = group.nextElementSibling;
    btns.forEach(btn => {
      btn.addEventListener("click", () => {
        btns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        if (panels) panels.querySelectorAll(".tab-panel").forEach(p => p.classList.toggle("active", p.id === `panel-${btn.dataset.tab}`));
      });
    });
  });
}

function bindCollectionControls() {
  const newBtn = document.getElementById("newCollectionBtn");
  const row = document.getElementById("newCollectionRow");
  const inp = document.getElementById("newCollectionInput");
  const show = () => { row.style.display = "flex"; newBtn.style.display = "none"; inp.value = ""; inp.focus(); };
  const hide = () => { row.style.display = "none"; newBtn.style.display = "block"; };
  const ok = () => { const n = inp.value.trim(); if (n) { Collections.create(n); Collections.renderList(); } hide(); };
  newBtn.addEventListener("click", show);
  document.getElementById("cancelNewCollectionBtn").addEventListener("click", hide);
  document.getElementById("confirmNewCollectionBtn").addEventListener("click", ok);
  inp.addEventListener("keydown", e => { if (e.key === "Enter") ok(); if (e.key === "Escape") hide(); });
}

function bindHistoryControls() {
  document.getElementById("clearHistoryBtn").addEventListener("click", () => { if (confirm("Clear all request history?")) History.clear(); });
}

function bindSaveBtn() {
  document.getElementById("saveBtn").addEventListener("click", openSaveModal);
}

// ---- Save request modal ----
function openSaveModal() {
  const overlay = document.getElementById("modalOverlay");
  document.getElementById("modalTitle").textContent = "Save Request";

  // Replace inner content to reset state.
  document.getElementById("modalBody").innerHTML = `
    <label>Collection</label>
    <select id="saveCollectionSelect" style="width:100%;padding:8px;margin:6px 0 12px;">
      ${Storage.getCollections().map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
      <option value="__new__">+ Create new collection...</option>
    </select>
    <div id="saveNewCollectionRow" style="display:none;margin-bottom:12px;">
      <input type="text" id="saveNewCollectionInput" placeholder="New collection name" />
    </div>
    <label>Request Name</label>
    <input type="text" id="saveRequestNameInput" placeholder="e.g. Login" value="Untitled" style="width:100%;padding:8px;margin-top:6px;" />`;

  const sel = document.getElementById("saveCollectionSelect");
  const newRow = document.getElementById("saveNewCollectionRow");
  sel.addEventListener("change", () => { newRow.style.display = sel.value === "__new__" ? "block" : "none"; });
  if (!Storage.getCollections().length) { sel.value = "__new__"; newRow.style.display = "block"; }

  // Strip old listeners by replacing buttons with clones.
  const oldSave = document.getElementById("modalSaveBtn");
  const newSave = oldSave.cloneNode(true);
  oldSave.replaceWith(newSave);

  const oldCancel = document.getElementById("modalCancelBtn");
  const newCancel = oldCancel.cloneNode(true);
  oldCancel.replaceWith(newCancel);

  overlay.style.display = "flex";

  newSave.addEventListener("click", () => {
    const name = document.getElementById("saveRequestNameInput").value.trim() || "Untitled";
    let colId = sel.value;
    if (colId === "__new__") {
      const n = document.getElementById("saveNewCollectionInput").value.trim();
      if (!n) return;
      colId = Collections.create(n).id;
    }
    const saved = Collections.addRequestToCollection(colId, name, RequestBuilder.getCurrentRequest());
    Collections.renderList();
    if (saved) {
      TabsManager.markAsSaved(colId, saved.id);
      const tab = TabsManager.tabs.find(t => t.id === TabsManager.activeId);
      if (tab) { tab.name = name; TabsManager.render(); }
      TabsManager.updateSaveBtn();
    }
    overlay.style.display = "none";
  });

  newCancel.addEventListener("click", () => { overlay.style.display = "none"; });

}
