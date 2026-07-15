// {{VAR}} autocomplete — shows matching env vars as you type "{{".

const AutoComplete = {
  dd: null, activeInput: null, startPos: null, sel: -1, items: [],

  init() {
    this.dd = document.getElementById("autocompleteDropdown");

    const url = document.getElementById("urlInput");
    url.addEventListener("input", () => this.handle(url));
    url.addEventListener("keydown", e => this.kd(e, url));
    url.addEventListener("blur", () => setTimeout(() => this.hide(), 150));
    url.addEventListener("click", () => this.handle(url));

    // Delegate for table inputs, body editor, auth fields.
    document.addEventListener("input", e => {
      const t = e.target;
      if (t.matches(".kv-table input[type='text'], .body-editor, #authFields input, #authFields textarea")) this.handle(t);
    }, true);

    document.addEventListener("keydown", e => {
      const t = e.target;
      if (t.matches(".kv-table input[type='text'], .body-editor, #authFields input, #authFields textarea")) this.kd(e, t);
    }, true);

    document.addEventListener("blur", e => {
      if (e.target.matches(".kv-table input[type='text'], .body-editor, #authFields input, #authFields textarea")) {
        setTimeout(() => this.hide(), 150);
      }
    }, true);
  },

  handle(input) {
    const val = input.value;
    const before = val.substring(0, input.selectionStart);
    const open = before.lastIndexOf("{{");
    if (open === -1 || before.lastIndexOf("}}") > open) { this.hide(); return; }

    const partial = before.substring(open + 2);
    const vars = this.getVars();
    const matches = Object.keys(vars).filter(k => k.toLowerCase().startsWith(partial.toLowerCase())).sort();
    if (!matches.length) { this.hide(); return; }

    this.activeInput = input; this.startPos = open; this.items = matches; this.sel = -1;
    this.render(matches, vars);
    this.position(input);
  },

  getVars() {
    const id = Storage.getActiveEnvId();
    if (!id) return {};
    const e = Storage.getEnvironments().find(x => x.id === id);
    return e ? e.variables : {};
  },

  render(matches, vars) {
    this.dd.innerHTML = "";
    matches.forEach((k, i) => {
      const item = document.createElement("div");
      item.className = `autocomplete-item${i === this.sel ? " selected" : ""}`;
      item.innerHTML = `<span class="ac-key">${escapeHtml(k)}</span><span class="ac-value">${escapeHtml(vars[k] || "")}</span>`;
      item.addEventListener("mousedown", e => { e.preventDefault(); this.insert(k); });
      item.addEventListener("mouseenter", () => {
        this.sel = i;
        this.dd.querySelectorAll(".autocomplete-item").forEach((el, j) => el.classList.toggle("selected", j === i));
      });
      this.dd.appendChild(item);
    });
    this.dd.classList.add("visible");
  },

  position(input) {
    const r = input.getBoundingClientRect();
    this.dd.style.cssText = `position:fixed;left:${r.left}px;top:${r.bottom + 2}px;width:${Math.min(r.width, 320)}px;`;
  },

  hide() {
    this.dd.classList.remove("visible");
    this.activeInput = null; this.startPos = null; this.sel = -1;
  },

  kd(e, input) {
    if (!this.dd.classList.contains("visible")) return;
    if (e.key === "ArrowDown") { e.preventDefault(); this.sel = Math.min(this.sel + 1, this.items.length - 1); this.hl(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); this.sel = Math.max(this.sel - 1, 0); this.hl(); }
    else if ((e.key === "Enter" || e.key === "Tab") && this.sel >= 0) { e.preventDefault(); this.insert(this.items[this.sel]); }
    else if (e.key === "Escape") this.hide();
  },

  hl() {
    this.dd.querySelectorAll(".autocomplete-item").forEach((el, i) => el.classList.toggle("selected", i === this.sel));
    if (this.sel >= 0) this.dd.querySelectorAll(".autocomplete-item")[this.sel]?.scrollIntoView({ block: "nearest" });
  },

  insert(key) {
    const inp = this.activeInput;
    if (!inp || this.startPos === null) { this.hide(); return; }
    const ins = `{{${key}}}`;
    inp.value = inp.value.substring(0, this.startPos) + ins + inp.value.substring(inp.selectionStart);
    const pos = this.startPos + ins.length;
    inp.selectionStart = inp.selectionEnd = pos;
    this.hide();
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    inp.focus();
  },
};
