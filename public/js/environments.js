// public/js/environments.js
//
// Handles: environment CRUD, the dropdown selector, and the {{VAR}}
// substitution pass that runs on the request right before sending.

const Environments = {
  // Returns the currently active environment's variables as a flat object,
  // e.g. { BASE_URL: "http://localhost:5000", TOKEN: "xxx" }.
  // Returns {} if no environment is active.
  getActiveVariables() {
    const activeId = Storage.getActiveEnvId();
    const environments = Storage.getEnvironments();
    const active = environments.find((e) => e.id === activeId);
    return active ? active.variables : {};
  },

  create(name) {
    const environments = Storage.getEnvironments();
    const newEnv = { id: generateId("env"), name, variables: {} };
    environments.push(newEnv);
    Storage.saveEnvironments(environments);
    return newEnv;
  },

  deleteEnv(id) {
    if (!confirm("Delete this environment?")) return;
    const environments = Storage.getEnvironments();
    Storage.saveEnvironments(environments.filter((e) => e.id !== id));
    if (Storage.getActiveEnvId() === id) Storage.setActiveEnvId("");
  },

  updateVariables(envId, variables) {
    const environments = Storage.getEnvironments();
    const env = environments.find((e) => e.id === envId);
    if (env) {
      env.variables = variables;
      Storage.saveEnvironments(environments);
    }
  },

  // Renders <option> elements into the sidebar <select>.
  renderSelector() {
    const select = document.getElementById("envSelector");
    const environments = Storage.getEnvironments();
    const activeId = Storage.getActiveEnvId();

    select.innerHTML = '<option value="">No Environment</option>';
    environments.forEach((env) => {
      const opt = document.createElement("option");
      opt.value = env.id;
      opt.textContent = env.name;
      if (env.id === activeId) opt.selected = true;
      select.appendChild(opt);
    });
  },

  // The core substitution function: replaces every {{KEY}} occurrence in a
  // string with the matching variable's value. If a key isn't found, the
  // placeholder is left untouched (visible feedback that a variable is missing,
  // rather than silently producing "undefined" in the URL).
  resolve(str, variables) {
    if (typeof str !== "string") return str;
    return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(variables, key) ? variables[key] : match;
    });
  },
};
