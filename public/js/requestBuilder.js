// Request builder UI and send flow. The actual HTTP call goes through our
// proxy endpoint so we don't hit CORS issues.

const RequestBuilder = {
  state: { params: [], headers: [], bodyMode: "none", bodyRaw: "", bodyFields: [], auth: { type: "none" } },
  _abort: null,

  init() {
    this.renderParams();
    this.renderHeaders();
    this.renderAuth();
    this.bind();
  },

  bind() {
    document.getElementById("addParamBtn").addEventListener("click", () => { this.state.params.push({ key: "", value: "", enabled: true }); this.renderParams(); });
    document.getElementById("addHeaderBtn").addEventListener("click", () => { this.state.headers.push({ key: "", value: "", enabled: true }); this.renderHeaders(); });
    document.getElementById("addBodyFieldBtn").addEventListener("click", () => { this.state.bodyFields.push({ key: "", value: "" }); this.renderBodyFields(); });
    document.getElementById("bodyRawEditor").addEventListener("input", e => { this.state.bodyRaw = e.target.value; });
    document.querySelectorAll('input[name="bodyMode"]').forEach(r => r.addEventListener("change", e => { this.state.bodyMode = e.target.value; this.showBodyPanel(); }));
    document.getElementById("authType").addEventListener("change", e => { this.state.auth = { type: e.target.value }; this.renderAuth(); });
    document.getElementById("sendBtn").addEventListener("click", () => this.send());
  },

  renderKv(id, rows, rerender) {
    const tb = document.querySelector(`#${id} tbody`);
    tb.innerHTML = "";
    rows.forEach((row, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><input type="checkbox" ${row.enabled ? "checked" : ""} data-field="enabled" /></td>
        <td><input type="text" value="${row.key}" data-field="key" placeholder="key" /></td>
        <td><input type="text" value="${row.value}" data-field="value" placeholder="value" /></td>
        <td><button class="btn-small remove-row">✕</button></td>`;
      tr.querySelector('[data-field="enabled"]').addEventListener("change", e => row.enabled = e.target.checked);
      tr.querySelector('[data-field="key"]').addEventListener("input", e => row.key = e.target.value);
      tr.querySelector('[data-field="value"]').addEventListener("input", e => row.value = e.target.value);
      tr.querySelector(".remove-row").addEventListener("click", () => { rows.splice(i, 1); rerender(); });
      tb.appendChild(tr);
    });
  },

  renderParams() { this.renderKv("paramsTable", this.state.params, () => this.renderParams()); },
  renderHeaders() { this.renderKv("headersTable", this.state.headers, () => this.renderHeaders()); },

  renderBodyFields() {
    const tb = document.querySelector("#bodyFieldsTable tbody");
    tb.innerHTML = "";
    this.state.bodyFields.forEach((row, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td></td><td><input type="text" value="${row.key}" data-field="key" /></td>
        <td><input type="text" value="${row.value}" data-field="value" /></td>
        <td><button class="btn-small remove-row">✕</button></td>`;
      tr.querySelector('[data-field="key"]').addEventListener("input", e => row.key = e.target.value);
      tr.querySelector('[data-field="value"]').addEventListener("input", e => row.value = e.target.value);
      tr.querySelector(".remove-row").addEventListener("click", () => { this.state.bodyFields.splice(i, 1); this.renderBodyFields(); });
      tb.appendChild(tr);
    });
  },

  showBodyPanel() {
    const raw = document.getElementById("bodyRawEditor");
    const tbl = document.getElementById("bodyFieldsTable");
    const btn = document.getElementById("addBodyFieldBtn");
    const m = this.state.bodyMode;
    raw.style.display = m === "json" || m === "raw" ? "block" : "none";
    tbl.style.display = m === "form-data" || m === "urlencoded" ? "table" : "none";
    btn.style.display = m === "form-data" || m === "urlencoded" ? "inline-block" : "none";
    if (m === "json" && !raw.value) raw.placeholder = '{ "name": "John", "email": "john@example.com" }';
  },

  renderAuth() {
    const el = document.getElementById("authFields");
    const t = this.state.auth.type;
    el.innerHTML = "";
    if (t === "bearer") {
      el.innerHTML = `<input type="text" id="authToken" placeholder="Token, e.g. {{TOKEN}}" />`;
      el.querySelector("#authToken").addEventListener("input", e => this.state.auth.token = e.target.value);
    } else if (t === "basic") {
      el.innerHTML = `<input type="text" id="authUser" placeholder="Username" /><input type="password" id="authPass" placeholder="Password" />`;
      el.querySelector("#authUser").addEventListener("input", e => this.state.auth.username = e.target.value);
      el.querySelector("#authPass").addEventListener("input", e => this.state.auth.password = e.target.value);
    } else if (t === "apikey") {
      el.innerHTML = `<input type="text" id="authKeyName" placeholder="Key name, e.g. x-api-key" />
        <input type="text" id="authKeyValue" placeholder="Key value" />
        <select id="authAddTo"><option value="header">Add to Header</option><option value="params">Add to Query Params</option></select>`;
      el.querySelector("#authKeyName").addEventListener("input", e => this.state.auth.key = e.target.value);
      el.querySelector("#authKeyValue").addEventListener("input", e => this.state.auth.value = e.target.value);
      el.querySelector("#authAddTo").addEventListener("change", e => this.state.auth.addTo = e.target.value);
    }
  },

  applyAuth(hdrs, params) {
    const a = this.state.auth;
    const h = [...hdrs], p = [...params];
    if (a.type === "bearer" && a.token) h.push({ key: "Authorization", value: `Bearer ${a.token}`, enabled: true });
    else if (a.type === "basic" && a.username) h.push({ key: "Authorization", value: `Basic ${btoa(`${a.username}:${a.password || ""}`)}`, enabled: true });
    else if (a.type === "apikey" && a.key) (a.addTo === "params" ? p : h).push({ key: a.key, value: a.value || "", enabled: true });
    return { headers: h, params: p };
  },

  buildBody() {
    const m = this.state.bodyMode;
    if (m === "none") return { body: undefined, contentType: null };
    if (m === "json" || m === "raw") return { body: this.state.bodyRaw, contentType: m === "json" ? "application/json" : "text/plain" };
    if (m === "urlencoded") {
      const usp = new URLSearchParams();
      this.state.bodyFields.forEach(f => usp.append(f.key, f.value));
      return { body: usp.toString(), contentType: "application/x-www-form-urlencoded" };
    }
    if (m === "form-data") {
      // The proxy builds the real multipart body — we just pass the fields.
      const o = {};
      this.state.bodyFields.forEach(f => o[f.key] = f.value);
      return { body: JSON.stringify(o), contentType: "application/json" };
    }
    return { body: undefined, contentType: null };
  },

  getCurrentRequest() {
    return {
      method: document.getElementById("methodSelect").value,
      url: document.getElementById("urlInput").value,
      params: [...this.state.params], headers: [...this.state.headers],
      bodyMode: this.state.bodyMode, bodyRaw: this.state.bodyRaw,
      bodyFields: [...this.state.bodyFields], auth: { ...this.state.auth },
    };
  },

  loadFromHistory(method, url) {
    document.getElementById("methodSelect").value = method;
    document.getElementById("urlInput").value = url;
  },

  loadRequest(req) {
    document.getElementById("methodSelect").value = req.method;
    document.getElementById("urlInput").value = req.url;
    this.state.params = req.params || [];
    this.state.headers = req.headers || [];
    this.state.bodyMode = req.bodyMode || "none";
    this.state.bodyRaw = req.bodyRaw || "";
    this.state.bodyFields = req.bodyFields || [];
    this.state.auth = req.auth || { type: "none" };
    this.renderParams(); this.renderHeaders(); this.renderBodyFields();
    document.getElementById("bodyRawEditor").value = this.state.bodyRaw;
    const radio = document.querySelector(`input[name="bodyMode"][value="${this.state.bodyMode}"]`);
    if (radio) radio.checked = true;
    this.showBodyPanel();
    document.getElementById("authType").value = this.state.auth.type;
    this.renderAuth();
  },

  async send() {
    const btn = document.getElementById("sendBtn");
    if (btn.disabled) return;
    btn.disabled = true; btn.textContent = "Sending...";
    this._abort = new AbortController();

    const env = Environments.getActiveVariables();
    const raw = this.getCurrentRequest();
    const { headers: hAuth, params: pAuth } = this.applyAuth(raw.headers, raw.params);

    let url = Environments.resolve(raw.url, env);
    const enabled = pAuth.filter(p => p.enabled && p.key);
    if (enabled.length) {
      const usp = new URLSearchParams();
      enabled.forEach(p => usp.append(p.key, Environments.resolve(p.value, env)));
      url += (url.includes("?") ? "&" : "?") + usp.toString();
    }

    const hdr = {};
    hAuth.filter(h => h.enabled && h.key).forEach(h => { hdr[h.key] = Environments.resolve(h.value, env); });
    const { body, contentType } = this.buildBody();
    const resolvedBody = body !== undefined ? Environments.resolve(body, env) : undefined;
    if (contentType && !hdr["Content-Type"]) hdr["Content-Type"] = contentType;

    Storage.addHistoryEntry(raw.method, url);
    History.renderList();
    ResponseViewer.showLoading();

    try {
      const resp = await fetch("/api/proxy", {
        method: "POST",
        signal: this._abort.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: raw.method, url,
          headers: hdr, body: resolvedBody,
          followRedirects: document.getElementById("followRedirects").checked,
          timeout: 30000,
          bodyMode: this.state.bodyMode,
          bodyFields: this.state.bodyMode === "form-data" ? this.state.bodyFields : undefined,
        }),
      });
      const data = await resp.json();
      ResponseViewer.render(data);
      TabsManager.saveResponse(data);
    } catch (err) {
      ResponseViewer.renderError(err.name === "AbortError" ? "Cancelled." : err.message);
    } finally {
      btn.disabled = false; btn.textContent = "Send";
      this._abort = null;
    }
  },
};
