// Environment CRUD, variable {{VAR}} resolution, and drag-to-insert.

const Environments = {
  getActiveVariables() {
    const id = Storage.getActiveEnvId();
    const env = Storage.getEnvironments().find(e => e.id === id);
    return env ? env.variables : {};
  },

  create(name) {
    const all = Storage.getEnvironments();
    const env = { id: generateId("env"), name, variables: {} };
    all.push(env);
    Storage.saveEnvironments(all);
    return env;
  },

  deleteEnv(id) {
    if (!confirm("Delete this environment?")) return;
    const list = Storage.getEnvironments().filter(e => e.id !== id);
    Storage.saveEnvironments(list);
    if (Storage.getActiveEnvId() === id) Storage.setActiveEnvId("");
  },

  updateVariables(envId, vars) {
    const all = Storage.getEnvironments();
    const env = all.find(e => e.id === envId);
    if (env) { env.variables = vars; Storage.saveEnvironments(all); }
  },

  renderSelector() {
    const sel = document.getElementById("envSelector");
    const envs = Storage.getEnvironments();
    const active = Storage.getActiveEnvId();
    sel.innerHTML = '<option value="">No Environment</option>';
    envs.forEach(e => {
      const opt = document.createElement("option");
      opt.value = e.id; opt.textContent = e.name;
      if (e.id === active) opt.selected = true;
      sel.appendChild(opt);
    });
  },

  resolve(str, vars) {
    if (typeof str !== "string") return str;
    return str.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_.-]*)\}\}/g, (m, k) =>
      Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m
    );
  },
};

// Drag-drop: drag variable keys from the sidebar into URL/header/body/auth fields.

const DragDrop = {
  init() {
    const url = document.getElementById("urlInput");
    const body = document.getElementById("bodyRawEditor");
    [url, body].forEach(el => {
      if (!el) return;
      el.addEventListener("dragover", e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; el.closest(".url-wrapper")?.classList.add("drag-over"); });
      el.addEventListener("dragleave", () => el.closest(".url-wrapper")?.classList.remove("drag-over"));
      el.addEventListener("drop", e => { e.preventDefault(); el.closest(".url-wrapper")?.classList.remove("drag-over"); this.insertAt(el, e.dataTransfer.getData("text/plain")); });
    });

    // Delegate for table inputs and auth fields.
    document.addEventListener("dragover", e => {
      const t = e.target;
      if (t.matches(".kv-table input[type='text'], #authFields input, #authFields textarea")) {
        e.preventDefault(); e.dataTransfer.dropEffect = "copy"; t.classList.add("drag-over-input");
      }
    }, true);
    document.addEventListener("dragleave", e => {
      const t = e.target;
      if (t.matches(".kv-table input[type='text'], #authFields input, #authFields textarea")) {
        t.classList.remove("drag-over-input");
      }
    }, true);
    document.addEventListener("drop", e => {
      const t = e.target;
      if (t.matches(".kv-table input[type='text'], #authFields input, #authFields textarea")) {
        e.preventDefault(); t.classList.remove("drag-over-input");
        this.insertAt(t, e.dataTransfer.getData("text/plain"));
      }
    }, true);
  },

  insertAt(input, text) {
    if (!text) return;
    const s = input.selectionStart, e = input.selectionEnd;
    input.value = input.value.substring(0, s) + text + input.value.substring(e);
    const p = s + text.length;
    input.selectionStart = input.selectionEnd = p;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  },
};
