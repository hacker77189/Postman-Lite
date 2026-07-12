// public/js/app.js
//
// Main application coordinator: initializes all modules on DOMContentLoaded,
// wires up the icon bar, environment sidebar, collection/history controls,
// save modal, and the config/response tab switching. Also provides shared
// utility functions (escapeHtml, getMethodColor, showMainContent).
//
document.addEventListener("DOMContentLoaded", () => {
  RequestBuilder.init();
  Environments.renderSelector();
  Collections.renderList();
  History.renderList();
  RequestBuilder.updateBodyPanelVisibility();

  bindTabs();
  bindIconBar();
  bindEnvironmentSidebar();
  bindCollectionControls();
  bindHistoryControls();
  bindSaveButton();
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

function getMethodColor(method) {
  return METHOD_COLORS[method] || "#aaa";
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function showMainContent(type) {
  const requestPanel = document.getElementById("requestPanel");
  const divider = document.getElementById("divider");
  const responsePanel = document.getElementById("responsePanel");
  const envEditor = document.getElementById("envEditorPanel");

  if (type === "environment") {
    requestPanel.style.display = "none";
    divider.style.display = "none";
    responsePanel.style.display = "none";
    envEditor.style.display = "flex";
  } else {
    requestPanel.style.display = "";
    divider.style.display = "";
    responsePanel.style.display = "";
    envEditor.style.display = "none";
  }
}

function bindIconBar() {
  const sidePanel = document.getElementById("sidePanel");

  document.querySelectorAll(".icon-btn[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = btn.dataset.panel;

      if (sidePanel.classList.contains("collapsed")) {
        sidePanel.classList.remove("collapsed");
      } else {
        const activeContent = document.querySelector(".side-panel-content.active");
        if (activeContent && activeContent.id === `${panel}-panel`) {
          sidePanel.classList.add("collapsed");
          document.querySelectorAll(".icon-btn[data-panel]").forEach((b) => b.classList.remove("active"));
          return;
        }
      }

      document.querySelectorAll(".icon-btn[data-panel]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      document.querySelectorAll(".side-panel-content").forEach((c) => c.classList.remove("active"));
      const target = document.getElementById(`${panel}-panel`);
      if (target) target.classList.add("active");

      if (panel === "environments") renderEnvVariablesList();
    });
  });
}

let _editingEnvId = null;

function renderEnvEditor(envId) {
  _editingEnvId = envId;
  const envs = Storage.getEnvironments();
  const env = envs.find((e) => e.id === envId);
  if (!env) return;

  document.getElementById("envEditorName").value = env.name;

  const tbody = document.querySelector("#envEditorTable tbody");
  tbody.innerHTML = "";

  const entries = Object.entries(env.variables);
  entries.forEach(([key, value], idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="text" class="env-ed-key" value="${escapeHtml(key)}" placeholder="KEY" data-idx="${idx}" /></td>
      <td><input type="text" class="env-ed-val" value="${escapeHtml(value)}" placeholder="value" data-idx="${idx}" /></td>
      <td><button class="remove-row" data-idx="${idx}" title="Delete">&times;</button></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("addEnvEditorVarBtn").onclick = () => {
    const tb = document.querySelector("#envEditorTable tbody");
    const tr = document.createElement("tr");
    const cnt = tb.children.length;
    tr.innerHTML = `
      <td><input type="text" class="env-ed-key" value="" placeholder="KEY" data-idx="${cnt}" /></td>
      <td><input type="text" class="env-ed-val" value="" placeholder="value" data-idx="${cnt}" /></td>
      <td><button class="remove-row" data-idx="${cnt}" title="Delete">&times;</button></td>
    `;
    tr.querySelector(".remove-row").addEventListener("click", () => {
      tr.remove();
    });
    tb.appendChild(tr);
    tr.querySelector(".env-ed-key").focus();
  };

  document.querySelectorAll("#envEditorTable .remove-row").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest("tr").remove();
    });
  });

  document.getElementById("envEditorSaveBtn").onclick = () => {
    saveEnvEditor();
  };

  let delBtn = document.getElementById("envEditorDeleteBtn");
  if (!delBtn) {
    delBtn = document.createElement("button");
    delBtn.id = "envEditorDeleteBtn";
    delBtn.className = "btn-secondary";
    delBtn.style.color = "#F44336";
    delBtn.textContent = "Delete Environment";
    document.querySelector(".env-editor-actions").appendChild(delBtn);
    delBtn.addEventListener("click", () => {
      if (!_editingEnvId) return;
      Environments.deleteEnv(_editingEnvId);
      TabsManager.tabs = TabsManager.tabs.filter((t) => !(t.type === "environment" && t.envId === _editingEnvId));
      if (TabsManager.tabs.length) {
        TabsManager.switchTab(TabsManager.tabs[0].id);
      } else {
        showMainContent("request");
      }
      Environments.renderSelector();
      renderEnvVariablesList();
      TabsManager.renderTabs();
    });
  }
}

function saveEnvEditor() {
  if (!_editingEnvId) return;
  const envs = Storage.getEnvironments();
  const env = envs.find((e) => e.id === _editingEnvId);
  if (!env) return;

  env.name = document.getElementById("envEditorName").value.trim() || env.name;

  const newVars = {};
  document.querySelectorAll("#envEditorTable tbody tr").forEach((tr) => {
    const k = tr.querySelector(".env-ed-key")?.value?.trim();
    const v = tr.querySelector(".env-ed-val")?.value || "";
    if (k) newVars[k] = v;
  });
  env.variables = newVars;
  Storage.saveEnvironments(envs);

  Environments.renderSelector();
  renderEnvVariablesList();

  const tab = TabsManager.tabs.find((t) => t.type === "environment" && t.envId === _editingEnvId);
  if (tab) {
    tab.name = `Env: ${env.name}`;
    TabsManager.renderTabs();
  }
}

function bindEnvironmentSidebar() {
  document.getElementById("envSelector").addEventListener("change", () => {
    const select = document.getElementById("envSelector");
    Storage.setActiveEnvId(select.value);
    renderEnvVariablesList();
  });

  document.getElementById("newEnvBtn").addEventListener("click", () => {
    const env = Environments.create("New Environment");
    Storage.setActiveEnvId(env.id);
    Environments.renderSelector();
    renderEnvVariablesList();
    TabsManager.openEnvTab(env.id, env.name);
  });

  document.getElementById("addEnvVarBtn").style.display = "none";
}

function renderEnvVariablesList() {
  const container = document.getElementById("envVariablesList");
  const envId = Storage.getActiveEnvId();

  container.innerHTML = "";

  if (!envId) {
    container.innerHTML = '<div class="history-empty">No environment selected.</div>';
    return;
  }

  const envs = Storage.getEnvironments();
  const env = envs.find((e) => e.id === envId);
  if (!env) {
    container.innerHTML = '<div class="history-empty">Environment not found.</div>';
    return;
  }

  const entries = Object.entries(env.variables);
  if (!entries.length) {
    container.innerHTML = '<div class="history-empty">No variables.</div>';
  } else {
    entries.forEach(([key, value]) => {
      const item = document.createElement("div");
      item.className = "env-key-item";
      item.draggable = true;
      item.dataset.varKey = key;
      item.innerHTML = `
        <span class="env-key-name">${escapeHtml(key)}</span>
        <span class="env-key-value">${escapeHtml(value)}</span>
      `;
      item.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", `{{${key}}}`);
        e.dataTransfer.effectAllowed = "copy";
      });
      container.appendChild(item);
    });
  }

  const editBtn = document.createElement("button");
  editBtn.className = "btn-edit-env";
  editBtn.textContent = "Edit Variables";
  editBtn.addEventListener("click", () => {
    TabsManager.openEnvTab(env.id, env.name);
  });
  container.appendChild(editBtn);

  const delEnvBtn = document.createElement("button");
  delEnvBtn.className = "btn-edit-env";
  delEnvBtn.style.marginTop = "4px";
  delEnvBtn.style.color = "#F44336";
  delEnvBtn.textContent = "Delete Environment";
  delEnvBtn.addEventListener("click", () => {
    const envId = Storage.getActiveEnvId();
    if (!envId) return;
    Environments.deleteEnv(envId);
    TabsManager.tabs = TabsManager.tabs.filter((t) => !(t.type === "environment" && t.envId === envId));
    if (TabsManager.activeTabId && !TabsManager.tabs.find((t) => t.id === TabsManager.activeTabId)) {
      if (TabsManager.tabs.length) {
        TabsManager.switchTab(TabsManager.tabs[0].id);
      } else {
        TabsManager.activeTabId = null;
      }
    }
    Environments.renderSelector();
    renderEnvVariablesList();
    TabsManager.renderTabs();
  });
  container.appendChild(delEnvBtn);
}

function bindTabs() {
  document.querySelectorAll(".tabs-row").forEach((tabGroup) => {
    const buttons = tabGroup.querySelectorAll(".tab-btn");
    const panelsContainer = tabGroup.nextElementSibling;

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        if (panelsContainer) {
          panelsContainer.querySelectorAll(".tab-panel").forEach((panel) => {
            panel.classList.toggle("active", panel.id === `panel-${btn.dataset.tab}`);
          });
        }
      });
    });
  });
}

function bindCollectionControls() {
  const newBtn = document.getElementById("newCollectionBtn");
  const row = document.getElementById("newCollectionRow");
  const input = document.getElementById("newCollectionInput");
  const confirmBtn = document.getElementById("confirmNewCollectionBtn");
  const cancelBtn = document.getElementById("cancelNewCollectionBtn");

  const showRow = () => {
    row.style.display = "flex";
    newBtn.style.display = "none";
    input.value = "";
    input.focus();
  };

  const hideRow = () => {
    row.style.display = "none";
    newBtn.style.display = "block";
  };

  const confirm = () => {
    const name = input.value.trim();
    if (name) {
      Collections.create(name);
      Collections.renderList();
    }
    hideRow();
  };

  newBtn.addEventListener("click", showRow);
  cancelBtn.addEventListener("click", hideRow);
  confirmBtn.addEventListener("click", confirm);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirm();
    if (e.key === "Escape") hideRow();
  });
}

function bindHistoryControls() {
  document.getElementById("clearHistoryBtn").addEventListener("click", () => {
    if (confirm("Clear all request history?")) {
      History.clear();
    }
  });
}

function bindSaveButton() {
  document.getElementById("saveBtn").addEventListener("click", () => {
    openSaveRequestModal();
  });
}

function openSaveRequestModal() {
  const modalOverlay = document.getElementById("modalOverlay");
  const modalBody = document.getElementById("modalBody");
  document.getElementById("modalTitle").textContent = "Save Request";

  const collections = Storage.getCollections();
  const CREATE_NEW_VALUE = "__create_new__";

  modalBody.innerHTML = `
    <label>Collection</label>
    <select id="saveCollectionSelect" style="width:100%;padding:8px;margin:6px 0 12px;">
      ${collections.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
      <option value="${CREATE_NEW_VALUE}">+ Create new collection...</option>
    </select>
    <div id="saveNewCollectionRow" style="display:none; margin-bottom:12px;">
      <input type="text" id="saveNewCollectionInput" placeholder="New collection name" />
    </div>
    <label>Request Name</label>
    <input type="text" id="saveRequestNameInput" placeholder="e.g. Login" value="New Request" style="width:100%;padding:8px;margin-top:6px;" />
  `;

  const select = document.getElementById("saveCollectionSelect");
  const newRow = document.getElementById("saveNewCollectionRow");

  select.addEventListener("change", () => {
    newRow.style.display = select.value === CREATE_NEW_VALUE ? "block" : "none";
  });

  if (!collections.length) {
    select.value = CREATE_NEW_VALUE;
    newRow.style.display = "block";
  }

  modalOverlay.style.display = "flex";

  const saveBtn = document.getElementById("modalSaveBtn");
  const cancelBtn = document.getElementById("modalCancelBtn");

  const onSave = () => {
    const requestName = document.getElementById("saveRequestNameInput").value.trim() || "New Request";
    let targetCollectionId = select.value;

    if (targetCollectionId === CREATE_NEW_VALUE) {
      const newName = document.getElementById("saveNewCollectionInput").value.trim();
      if (!newName) return;
      targetCollectionId = Collections.create(newName).id;
    }

    Collections.addRequestToCollection(targetCollectionId, requestName, RequestBuilder.getCurrentRequest());
    Collections.renderList();
    modalOverlay.style.display = "none";
    cleanup();
  };

  const onCancel = () => {
    modalOverlay.style.display = "none";
    cleanup();
  };

  function cleanup() {
    saveBtn.removeEventListener("click", onSave);
    cancelBtn.removeEventListener("click", onCancel);
  }

  saveBtn.addEventListener("click", onSave);
  cancelBtn.addEventListener("click", onCancel);
}
