// public/js/dragDrop.js
//
// Enables dragging environment variables from the sidebar into URL, header,
// body, and auth fields. Handles visual drag-over feedback across all targets.
//
const DragDrop = {
  init() {
    const inputs = [
      document.getElementById("urlInput"),
      document.getElementById("bodyRawEditor"),
    ];

    inputs.forEach((el) => {
      if (el) {
        el.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; el.closest(".url-wrapper")?.classList.add("drag-over"); });
        el.addEventListener("dragleave", () => el.closest(".url-wrapper")?.classList.remove("drag-over"));
        el.addEventListener("drop", (e) => { e.preventDefault(); el.closest(".url-wrapper")?.classList.remove("drag-over"); this.insertAtCursor(el, e.dataTransfer.getData("text/plain")); });
      }
    });

    document.addEventListener("dragover", (e) => {
      const target = e.target;
      if (target.matches(".kv-table input[type='text'], #authFields input, #authFields textarea")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        target.classList.add("drag-over-input");
      }
    }, true);

    document.addEventListener("dragleave", (e) => {
      if (e.target.matches(".kv-table input[type='text'], #authFields input, #authFields textarea")) {
        e.target.classList.remove("drag-over-input");
      }
    }, true);

    document.addEventListener("drop", (e) => {
      const target = e.target;
      if (target.matches(".kv-table input[type='text'], #authFields input, #authFields textarea")) {
        e.preventDefault();
        target.classList.remove("drag-over-input");
        this.insertAtCursor(target, e.dataTransfer.getData("text/plain"));
      }
    }, true);
  },

  insertAtCursor(input, text) {
    if (!text) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value;
    input.value = val.substring(0, start) + text + val.substring(end);
    const newPos = start + text.length;
    input.selectionStart = input.selectionEnd = newPos;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  },
};
