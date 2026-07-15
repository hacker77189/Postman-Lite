const SECURITY_HEADERS = [
  { name: "Strict-Transport-Security", desc: "Enforces HTTPS connections", severity: "high" },
  { name: "Content-Security-Policy", desc: "Controls resource loading", severity: "high" },
  { name: "X-Frame-Options", desc: "Prevents clickjacking", severity: "medium" },
  { name: "X-Content-Type-Options", desc: "Prevents MIME sniffing", severity: "medium" },
  { name: "Referrer-Policy", desc: "Controls referrer info leakage", severity: "low" },
  { name: "Permissions-Policy", desc: "Restricts browser API access", severity: "low" },
];

const ResponseViewer = {
  _lastData: null,

  showLoading() {
    document.getElementById("responseMeta").textContent = "Sending request...";
    ["responseBody", "responseHeaders", "responseCookies", "responseSecurity", "responseSchema"].forEach(id => document.getElementById(id).textContent = "");
    document.getElementById("jwtInspector").style.display = "none";
  },

  render(data) {
    this._lastData = data;
    if (data.error) { this.renderError(data.error); return; }

    const ok = data.status >= 200 && data.status < 400;
    document.getElementById("responseMeta").innerHTML =
      `<span class="${ok ? "status-ok" : "status-err"}">${data.status} ${data.statusText}</span> &middot; ${data.timeMs} ms &middot; ${this.fmtSize(data.sizeBytes)}`;

    document.getElementById("responseBody").textContent = this.fmtBody(data.body);
    document.getElementById("responseHeaders").textContent =
      Object.entries(data.headers).map(([k, v]) => `${k}: ${v}`).join("\n");
    document.getElementById("responseCookies").textContent = this.fmtCookies(data.headers);

    this.renderSecurity(data.headers);
    this.renderSchema(data.body);
    this.renderJwtInspector(data.body);
  },

  renderError(msg) {
    document.getElementById("responseMeta").innerHTML = `<span class="status-err">Request failed</span>`;
    document.getElementById("responseBody").textContent = msg;
    ["responseHeaders", "responseCookies", "responseSecurity", "responseSchema"].forEach(id => document.getElementById(id).textContent = "");
    document.getElementById("jwtInspector").style.display = "none";
  },

  renderSecurity(headers) {
    const el = document.getElementById("responseSecurity");
    const h = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));

    const lines = SECURITY_HEADERS.map(sh => {
      const found = h[sh.name.toLowerCase()];
      const icon = found ? "✅" : "❌";
      const value = found ? ` &mdash; <span class="sec-value">${escapeHtml(found)}</span>` : "";
      return `${icon} <span class="sec-name">${sh.name}</span>${value}\n   ${sh.desc}`;
    });

    el.innerHTML = lines.join("\n\n");
  },

  renderSchema(body) {
    const el = document.getElementById("responseSchema");
    let obj;
    try { obj = JSON.parse(body); } catch { el.textContent = "Response is not JSON."; return; }

    const fmt = (schema, indent) => {
      if (schema === null || typeof schema !== "object") return String(schema);
      if (Array.isArray(schema)) {
        return schema.length ? `[${fmt(schema[0], indent)}]` : "[]";
      }
      const pad = "  ".repeat(indent);
      const inner = Object.entries(schema).map(([k, v]) => {
        const val = typeof v === "object" && v !== null && !Array.isArray(v)
          ? `{\n${fmt(v, indent + 1)}\n${pad}}`
          : fmt(v, indent);
        return `${pad}  ${k}: ${val}`;
      }).join("\n");
      return inner;
    };

    const schema = this._detectSchema(obj);
    el.textContent = `{\n${fmt(schema, 1)}\n}`;
  },

  renderJwtInspector(body) {
    const container = document.getElementById("jwtInspector");
    container.style.display = "none";
    container.innerHTML = "";

    const trimmed = body.trim();
    const parts = trimmed.split(".");
    if (parts.length !== 3) return;
    if (!/^eyJ[A-Za-z0-9_-]+$/.test(parts[0])) return;

    const decode = (str) => {
      try {
        const json = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.stringify(JSON.parse(json), null, 2);
      } catch { return null; }
    };

    const header = decode(parts[0]);
    const payload = decode(parts[1]);
    if (!header || !payload) return;

    container.style.display = "block";
    container.innerHTML = `
      <div class="jwt-header">
        <span class="jwt-title">🔐 JWT Decoded</span>
        <button class="jwt-toggle" id="jwtToggleBtn">Hide</button>
      </div>
      <div class="jwt-content" id="jwtContent">
        <div class="jwt-section">
          <div class="jwt-section-title">Header (algorithm &amp; type)</div>
          <pre class="jwt-pre">${escapeHtml(header)}</pre>
        </div>
        <div class="jwt-section">
          <div class="jwt-section-title">Payload (claims)</div>
          <pre class="jwt-pre">${escapeHtml(payload)}</pre>
        </div>
        <div class="jwt-section">
          <div class="jwt-section-title">Signature</div>
          <pre class="jwt-pre jwt-sig">${escapeHtml(parts[2].substring(0, 48))}${parts[2].length > 48 ? "..." : ""}</pre>
        </div>
      </div>`;

    document.getElementById("jwtToggleBtn").addEventListener("click", () => {
      const content = document.getElementById("jwtContent");
      const btn = document.getElementById("jwtToggleBtn");
      if (content.style.display === "none") {
        content.style.display = "";
        btn.textContent = "Hide";
      } else {
        content.style.display = "none";
        btn.textContent = "Show";
      }
    });
  },

  _detectSchema(obj) {
    if (obj === null || obj === undefined) return "null";
    if (Array.isArray(obj)) {
      if (obj.length === 0) return "[]";
      const item = obj[0];
      if (typeof item === "object" && item !== null) {
        return [this._detectSchema(item)];
      }
      return [typeof item];
    }
    if (typeof obj === "object") {
      const s = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined) s[k] = "null";
        else if (Array.isArray(v)) {
          s[k] = v.length > 0 && typeof v[0] === "object" && v[0] !== null
            ? [this._detectSchema(v[0])]
            : v.length > 0 ? [typeof v[0]] : "[]";
        } else if (typeof v === "object") s[k] = this._detectSchema(v);
        else s[k] = typeof v;
      }
      return s;
    }
    return typeof obj;
  },

  fmtBody(text) {
    try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
  },

  fmtSize(b) { return b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`; },

  fmtCookies(hdrs) {
    const raw = hdrs["set-cookie"];
    if (!raw) return "No cookies in response.";
    const list = Array.isArray(raw) ? raw : [raw];
    return list.map(c => {
      const parts = c.split(";").map(p => p.trim());
      return `${parts[0]}\n  ${parts.slice(1).join("\n  ") || "(no attributes)"}`;
    }).join("\n\n");
  },
};
