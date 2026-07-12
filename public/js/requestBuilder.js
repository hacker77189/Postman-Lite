// public/js/requestBuilder.js
//
// Owns the request-building UI: params table, headers table, body editor,
// auth fields. Also owns the "Send" flow: assemble the request object,
// resolve {{variables}}, apply auth, and POST it to our own /api/proxy
// endpoint (which is what actually talks to the target API -- see
// server/routes/proxy.js for why that split exists).

const RequestBuilder = {
  // In-memory state for the request currently being edited.
  // Params/headers/body-fields are stored as row arrays so the UI tables
  // and this state stay in sync.
  state: {
    params: [],
    headers: [],
    bodyMode: "none",
    bodyRaw: "",
    bodyFields: [],
    auth: { type: "none" },
  },

  init() {
    this.renderParamsTable();
    this.renderHeadersTable();
    this.renderAuthFields();
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById("addParamBtn").addEventListener("click", () => {
      this.state.params.push({ key: "", value: "", enabled: true });
      this.renderParamsTable();
    });

    document.getElementById("addHeaderBtn").addEventListener("click", () => {
      this.state.headers.push({ key: "", value: "", enabled: true });
      this.renderHeadersTable();
    });

    document.getElementById("addBodyFieldBtn").addEventListener("click", () => {
      this.state.bodyFields.push({ key: "", value: "" });
      this.renderBodyFieldsTable();
    });

    document.getElementById("bodyRawEditor").addEventListener("input", (e) => {
      this.state.bodyRaw = e.target.value;
    });

    document.querySelectorAll('input[name="bodyMode"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.state.bodyMode = e.target.value;
        this.updateBodyPanelVisibility();
      });
    });

    document.getElementById("authType").addEventListener("change", (e) => {
      this.state.auth = { type: e.target.value };
      this.renderAuthFields();
    });

    document.getElementById("sendBtn").addEventListener("click", () => this.send());
  },

  // ---------- Params table ----------
  renderParamsTable() {
    this.renderKvTable("paramsTable", this.state.params, () => this.renderParamsTable());
  },

  // ---------- Headers table ----------
  renderHeadersTable() {
    this.renderKvTable("headersTable", this.state.headers, () => this.renderHeadersTable());
  },

  // ---------- Body fields table (form-data / urlencoded) ----------
  renderBodyFieldsTable() {
    const tbody = document.querySelector("#bodyFieldsTable tbody");
    tbody.innerHTML = "";
    this.state.bodyFields.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td></td>
        <td><input type="text" value="${row.key}" data-field="key" /></td>
        <td><input type="text" value="${row.value}" data-field="value" /></td>
        <td><button class="btn-small remove-row">✕</button></td>
      `;
      tr.querySelector('[data-field="key"]').addEventListener("input", (e) => {
        row.key = e.target.value;
      });
      tr.querySelector('[data-field="value"]').addEventListener("input", (e) => {
        row.value = e.target.value;
      });
      tr.querySelector(".remove-row").addEventListener("click", () => {
        this.state.bodyFields.splice(index, 1);
        this.renderBodyFieldsTable();
      });
      tbody.appendChild(tr);
    });
  },

  // Shared renderer for the params/headers key-value tables, which both
  // include an enabled checkbox, a key input, a value input, and a remove button.
  renderKvTable(tableId, rows, rerender) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    tbody.innerHTML = "";
    rows.forEach((row, index) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="checkbox" ${row.enabled ? "checked" : ""} data-field="enabled" /></td>
        <td><input type="text" value="${row.key}" data-field="key" placeholder="key" /></td>
        <td><input type="text" value="${row.value}" data-field="value" placeholder="value" /></td>
        <td><button class="btn-small remove-row">✕</button></td>
      `;
      tr.querySelector('[data-field="enabled"]').addEventListener("change", (e) => {
        row.enabled = e.target.checked;
      });
      tr.querySelector('[data-field="key"]').addEventListener("input", (e) => {
        row.key = e.target.value;
      });
      tr.querySelector('[data-field="value"]').addEventListener("input", (e) => {
        row.value = e.target.value;
      });
      tr.querySelector(".remove-row").addEventListener("click", () => {
        rows.splice(index, 1);
        rerender();
      });
      tbody.appendChild(tr);
    });
  },

  updateBodyPanelVisibility() {
    const rawEditor = document.getElementById("bodyRawEditor");
    const fieldsTable = document.getElementById("bodyFieldsTable");
    const addFieldBtn = document.getElementById("addBodyFieldBtn");

    const mode = this.state.bodyMode;
    rawEditor.style.display = mode === "json" || mode === "raw" ? "block" : "none";
    fieldsTable.style.display = mode === "form-data" || mode === "urlencoded" ? "table" : "none";
    addFieldBtn.style.display = mode === "form-data" || mode === "urlencoded" ? "inline-block" : "none";

    if (mode === "json" && !rawEditor.value) {
      rawEditor.placeholder = '{ "name": "John", "email": "john@example.com" }';
    }
  },

  // ---------- Auth fields ----------
  renderAuthFields() {
    const container = document.getElementById("authFields");
    const type = this.state.auth.type;
    container.innerHTML = "";

    if (type === "bearer") {
      container.innerHTML = `<input type="text" id="authToken" placeholder="Token, e.g. {{TOKEN}}" style="width:100%;padding:8px;margin-top:8px;" />`;
      container.querySelector("#authToken").addEventListener("input", (e) => {
        this.state.auth.token = e.target.value;
      });
    } else if (type === "basic") {
      container.innerHTML = `
        <input type="text" id="authUser" placeholder="Username" style="width:100%;padding:8px;margin-top:8px;" />
        <input type="password" id="authPass" placeholder="Password" style="width:100%;padding:8px;margin-top:8px;" />
      `;
      container.querySelector("#authUser").addEventListener("input", (e) => {
        this.state.auth.username = e.target.value;
      });
      container.querySelector("#authPass").addEventListener("input", (e) => {
        this.state.auth.password = e.target.value;
      });
    } else if (type === "apikey") {
      container.innerHTML = `
        <input type="text" id="authKeyName" placeholder="Key name, e.g. x-api-key" style="width:100%;padding:8px;margin-top:8px;" />
        <input type="text" id="authKeyValue" placeholder="Key value" style="width:100%;padding:8px;margin-top:8px;" />
        <select id="authAddTo" style="width:100%;padding:8px;margin-top:8px;">
          <option value="header">Add to Header</option>
          <option value="params">Add to Query Params</option>
        </select>
      `;
      container.querySelector("#authKeyName").addEventListener("input", (e) => {
        this.state.auth.key = e.target.value;
      });
      container.querySelector("#authKeyValue").addEventListener("input", (e) => {
        this.state.auth.value = e.target.value;
      });
      container.querySelector("#authAddTo").addEventListener("change", (e) => {
        this.state.auth.addTo = e.target.value;
      });
    }
  },

  // Applies the configured auth method by injecting the right header or
  // query param. Returns fresh copies so we don't mutate this.state directly.
  applyAuth(headers, params) {
    const auth = this.state.auth;
    const newHeaders = [...headers];
    const newParams = [...params];

    if (auth.type === "bearer" && auth.token) {
      newHeaders.push({ key: "Authorization", value: `Bearer ${auth.token}`, enabled: true });
    } else if (auth.type === "basic" && auth.username) {
      const encoded = btoa(`${auth.username}:${auth.password || ""}`);
      newHeaders.push({ key: "Authorization", value: `Basic ${encoded}`, enabled: true });
    } else if (auth.type === "apikey" && auth.key) {
      const target = auth.addTo === "params" ? newParams : newHeaders;
      target.push({ key: auth.key, value: auth.value || "", enabled: true });
    }

    return { headers: newHeaders, params: newParams };
  },

  // Builds the outgoing body value based on the selected mode.
  // form-data/urlencoded get serialized into a single string here so the
  // Express backend can send them on as plain fetch bodies.
  buildBodyForSend() {
    const mode = this.state.bodyMode;

    if (mode === "none") return { body: undefined, contentType: null };
    if (mode === "json" || mode === "raw") {
      return {
        body: this.state.bodyRaw,
        contentType: mode === "json" ? "application/json" : "text/plain",
      };
    }
    if (mode === "urlencoded") {
      const usp = new URLSearchParams();
      this.state.bodyFields.forEach((f) => usp.append(f.key, f.value));
      return { body: usp.toString(), contentType: "application/x-www-form-urlencoded" };
    }
    if (mode === "form-data") {
      // Simplified: since our proxy is server-side and needs a plain string
      // (not a browser FormData object) to forward on, we build a
      // multipart-style body manually is overkill for a hackathon MVP --
      // instead we send fields as JSON and let the backend know via a
      // custom marker so it can reconstruct FormData server-side if needed.
      // For most test APIs, urlencoded/JSON cover the real use cases.
      const obj = {};
      this.state.bodyFields.forEach((f) => (obj[f.key] = f.value));
      return { body: JSON.stringify(obj), contentType: "application/json" };
    }
    return { body: undefined, contentType: null };
  },

  // Assembles the full request object from current UI state, WITHOUT
  // resolving variables yet (resolution happens right before send so saved
  // requests in collections keep their raw {{VAR}} form).
  getCurrentRequest() {
    return {
      method: document.getElementById("methodSelect").value,
      url: document.getElementById("urlInput").value,
      params: [...this.state.params],
      headers: [...this.state.headers],
      bodyMode: this.state.bodyMode,
      bodyRaw: this.state.bodyRaw,
      bodyFields: [...this.state.bodyFields],
      auth: { ...this.state.auth },
    };
  },

  // Loads just a method + URL from a history entry. History only tracks
  // "what did I send and where" -- not the full params/headers/body/auth --
  // so unlike loadRequest() below, this leaves the rest of the builder as-is.
  loadFromHistory(method, url) {
    document.getElementById("methodSelect").value = method;
    document.getElementById("urlInput").value = url;
  },

  // Loads a previously-saved request (from a collection) back into the UI.
  loadRequest(requestData) {
    document.getElementById("methodSelect").value = requestData.method;
    document.getElementById("urlInput").value = requestData.url;

    this.state.params = requestData.params || [];
    this.state.headers = requestData.headers || [];
    this.state.bodyMode = requestData.bodyMode || "none";
    this.state.bodyRaw = requestData.bodyRaw || "";
    this.state.bodyFields = requestData.bodyFields || [];
    this.state.auth = requestData.auth || { type: "none" };

    this.renderParamsTable();
    this.renderHeadersTable();
    this.renderBodyFieldsTable();
    document.getElementById("bodyRawEditor").value = this.state.bodyRaw;
    document.querySelector(`input[name="bodyMode"][value="${this.state.bodyMode}"]`).checked = true;
    this.updateBodyPanelVisibility();
    document.getElementById("authType").value = this.state.auth.type;
    this.renderAuthFields();
  },

  // The main "Send" flow.
  async send() {
    const env = Environments.getActiveVariables();
    const raw = this.getCurrentRequest();

    // Apply auth (may add a header or param) before resolving variables,
    // since auth values like tokens are often themselves {{VARIABLES}}.
    const { headers: headersWithAuth, params: paramsWithAuth } = this.applyAuth(raw.headers, raw.params);

    // Resolve {{VAR}} everywhere: URL, enabled param values, enabled header values, body.
    let resolvedUrl = Environments.resolve(raw.url, env);

    const enabledParams = paramsWithAuth.filter((p) => p.enabled && p.key);
    if (enabledParams.length) {
      const usp = new URLSearchParams();
      enabledParams.forEach((p) => usp.append(p.key, Environments.resolve(p.value, env)));
      resolvedUrl += (resolvedUrl.includes("?") ? "&" : "?") + usp.toString();
    }

    const headerObj = {};
    headersWithAuth
      .filter((h) => h.enabled && h.key)
      .forEach((h) => {
        headerObj[h.key] = Environments.resolve(h.value, env);
      });

    const { body, contentType } = this.buildBodyForSend();
    const resolvedBody = body !== undefined ? Environments.resolve(body, env) : undefined;
    if (contentType && !headerObj["Content-Type"]) {
      headerObj["Content-Type"] = contentType;
    }

    // Log to history before sending (same behavior as Postman -- a request
    // that fails or times out still shows up in history, since "what did I
    // just try to send" is the useful record, not just successes).
    Storage.addHistoryEntry(raw.method, resolvedUrl);
    History.renderList();

    ResponseViewer.showLoading();

    try {
      const proxyResponse = await fetch("/api/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: raw.method,
          url: resolvedUrl,
          headers: headerObj,
          body: resolvedBody,
        }),
      });

      const data = await proxyResponse.json();
      ResponseViewer.render(data);
    } catch (err) {
      ResponseViewer.renderError(err.message);
    }
  },
};
