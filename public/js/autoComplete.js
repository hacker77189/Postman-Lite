// public/js/autoComplete.js
//
// Provides {{VAR}} autocomplete for any text input or textarea. When the
// user types '{{', a dropdown appears showing matching environment variables.
//
const AutoComplete = {
  dropdown: null,
  activeInput: null,
  startPos: null,
  selectedIdx: -1,
  items: [],

  init() {
    this.dropdown = document.getElementById("autocompleteDropdown");

    const urlInput = document.getElementById("urlInput");
    urlInput.addEventListener("input", () => this.handleInput(urlInput));
    urlInput.addEventListener("keydown", (e) => this.handleKeydown(e, urlInput));
    urlInput.addEventListener("blur", () => setTimeout(() => this.hide(), 150));
    urlInput.addEventListener("click", () => this.handleInput(urlInput));

    document.addEventListener("input", (e) => {
      const target = e.target;
      if (target.matches(".kv-table input[type='text']") || target.matches(".body-editor") || target.matches("#authFields input, #authFields textarea")) {
        this.handleInput(target);
      }
    }, true);

    document.addEventListener("keydown", (e) => {
      const target = e.target;
      if (target.matches(".kv-table input[type='text']") || target.matches(".body-editor") || target.matches("#authFields input, #authFields textarea")) {
        this.handleKeydown(e, target);
      }
    }, true);

    document.addEventListener("blur", (e) => {
      if (e.target.matches(".kv-table input[type='text'], .body-editor, #authFields input, #authFields textarea")) {
        setTimeout(() => this.hide(), 150);
      }
    }, true);
  },

  handleInput(input) {
    const val = input.value;
    const selStart = input.selectionStart;
    const textBefore = val.substring(0, selStart);

    const lastOpen = textBefore.lastIndexOf("{{");
    if (lastOpen === -1 || textBefore.lastIndexOf("}}") > lastOpen) {
      this.hide();
      return;
    }

    const partial = textBefore.substring(lastOpen + 2);

    const env = this.getActiveVars();
    const matches = Object.keys(env)
      .filter((k) => k.toLowerCase().startsWith(partial.toLowerCase()))
      .sort();

    if (!matches.length) { this.hide(); return; }

    this.activeInput = input;
    this.startPos = lastOpen;
    this.items = matches;
    this.selectedIdx = -1;
    this.renderDropdown(matches, env, partial);
    this.positionDropdown(input);
  },

  getActiveVars() {
    const id = Storage.getActiveEnvId();
    if (!id) return {};
    const envs = Storage.getEnvironments();
    const env = envs.find((e) => e.id === id);
    return env ? env.variables : {};
  },

  renderDropdown(matches, env, partial) {
    const dd = this.dropdown;
    dd.innerHTML = "";
    matches.forEach((key, i) => {
      const item = document.createElement("div");
      item.className = `autocomplete-item${i === this.selectedIdx ? " selected" : ""}`;
      const value = env[key] || "";
      item.innerHTML = `<span class="ac-key">${escapeHtml(key)}</span><span class="ac-value">${escapeHtml(value)}</span>`;
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.insert(key);
      });
      item.addEventListener("mouseenter", () => {
        this.selectedIdx = i;
        dd.querySelectorAll(".autocomplete-item").forEach((el, j) => el.classList.toggle("selected", j === i));
      });
      dd.appendChild(item);
    });
    dd.classList.add("visible");
  },

  positionDropdown(input) {
    const dd = this.dropdown;
    dd.style.position = "fixed";
    const rect = input.getBoundingClientRect();
    dd.style.left = rect.left + "px";
    dd.style.top = (rect.bottom + 2) + "px";
    dd.style.width = Math.min(rect.width, 320) + "px";
  },

  hide() {
    this.dropdown.classList.remove("visible");
    this.activeInput = null;
    this.startPos = null;
    this.selectedIdx = -1;
  },

  handleKeydown(e, input) {
    if (!this.dropdown.classList.contains("visible")) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.selectedIdx = Math.min(this.selectedIdx + 1, this.items.length - 1);
      this.highlightSelected();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.selectedIdx = Math.max(this.selectedIdx - 1, 0);
      this.highlightSelected();
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (this.selectedIdx >= 0 && this.selectedIdx < this.items.length) {
        e.preventDefault();
        this.insert(this.items[this.selectedIdx]);
      }
    } else if (e.key === "Escape") {
      this.hide();
    }
  },

  highlightSelected() {
    const items = this.dropdown.querySelectorAll(".autocomplete-item");
    items.forEach((el, i) => el.classList.toggle("selected", i === this.selectedIdx));
    if (this.selectedIdx >= 0 && items[this.selectedIdx]) {
      items[this.selectedIdx].scrollIntoView({ block: "nearest" });
    }
  },

  insert(key) {
    const input = this.activeInput;
    if (!input || this.startPos === null) { this.hide(); return; }
    const val = input.value;
    const selStart = input.selectionStart;
    const insertion = `{{${key}}}`;
    input.value = val.substring(0, this.startPos) + insertion + val.substring(selStart);
    const newPos = this.startPos + insertion.length;
    input.selectionStart = input.selectionEnd = newPos;
    this.hide();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  },
};
