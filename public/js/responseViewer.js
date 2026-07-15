// Renders whatever came back from the proxy — body, headers, timing.

const ResponseViewer = {
  showLoading() {
    document.getElementById("responseMeta").textContent = "Sending request...";
    ["responseBody", "responseHeaders", "responseCookies"].forEach(id => document.getElementById(id).textContent = "");
  },

  render(data) {
    if (data.error) { this.renderError(data.error); return; }

    const ok = data.status >= 200 && data.status < 400;
    document.getElementById("responseMeta").innerHTML =
      `<span class="${ok ? "status-ok" : "status-err"}">${data.status} ${data.statusText}</span> &middot; ${data.timeMs} ms &middot; ${this.fmtSize(data.sizeBytes)}`;

    document.getElementById("responseBody").textContent = this.fmtBody(data.body);
    document.getElementById("responseHeaders").textContent =
      Object.entries(data.headers).map(([k, v]) => `${k}: ${v}`).join("\n");
    document.getElementById("responseCookies").textContent = this.fmtCookies(data.headers);
  },

  renderError(msg) {
    document.getElementById("responseMeta").innerHTML = `<span class="status-err">Request failed</span>`;
    document.getElementById("responseBody").textContent = msg;
    ["responseHeaders", "responseCookies"].forEach(id => document.getElementById(id).textContent = "");
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
