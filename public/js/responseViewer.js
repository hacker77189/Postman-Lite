// public/js/responseViewer.js
//
// Takes whatever our /api/proxy endpoint returned and renders it: status
// line with color coding, formatted JSON body (or raw text if not JSON),
// response headers, timing, and size.

const ResponseViewer = {
  showLoading() {
    document.getElementById("responseMeta").textContent = "Sending request...";
    document.getElementById("responseBody").textContent = "";
    document.getElementById("responseHeaders").textContent = "";
    document.getElementById("responseCookies").textContent = "";
  },

  render(data) {
    const metaEl = document.getElementById("responseMeta");
    const bodyEl = document.getElementById("responseBody");
    const headersEl = document.getElementById("responseHeaders");
    const cookiesEl = document.getElementById("responseCookies");

    if (data.error) {
      this.renderError(data.error);
      return;
    }

    const statusClass = data.status >= 200 && data.status < 400 ? "status-ok" : "status-err";
    metaEl.innerHTML = `
      <span class="${statusClass}">${data.status} ${data.statusText}</span>
      &nbsp;&middot;&nbsp; ${data.timeMs} ms
      &nbsp;&middot;&nbsp; ${this.formatSize(data.sizeBytes)}
    `;

    bodyEl.textContent = this.formatBody(data.body);
    headersEl.textContent = Object.entries(data.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
    cookiesEl.textContent = this.formatCookies(data.headers);
  },

  renderError(message) {
    document.getElementById("responseMeta").innerHTML = `<span class="status-err">Request failed</span>`;
    document.getElementById("responseBody").textContent = message;
    document.getElementById("responseHeaders").textContent = "";
    document.getElementById("responseCookies").textContent = "";
  },

  // Tries to pretty-print JSON; falls back to showing raw text if the
  // response body isn't valid JSON (e.g. HTML error pages, plain text).
  formatBody(text) {
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return text;
    }
  },

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  },

  formatCookies(headers) {
    const raw = headers["set-cookie"];
    if (!raw) return "No cookies in response.";
    const cookies = Array.isArray(raw) ? raw : [raw];
    return cookies
      .map((c) => {
        const parts = c.split(";").map((p) => p.trim());
        const nvp = parts[0];
        const attrs = parts.slice(1).join("\n  ") || "(no attributes)";
        return `${nvp}\n  ${attrs}`;
      })
      .join("\n\n");
  },
};
