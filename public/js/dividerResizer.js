// public/js/dividerResizer.js
//
// Manages the draggable horizontal divider between the request builder
// and the response panel. Supports collapse/expand on double-click.
//
const DividerResizer = {
  isDragging: false,
  prevHeight: null,

  init() {
    const divider = document.getElementById("divider");

    divider.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      divider.classList.add("active");
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const main = document.querySelector(".main");
      const rect = main.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const dividerH = 4;
      const requestPanel = document.getElementById("requestPanel");
      const minR = 100;
      const maxR = rect.height - 60 - dividerH;
      const h = Math.max(minR, Math.min(y - 0, maxR));
      requestPanel.style.height = h + "px";
    });

    document.addEventListener("mouseup", () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      divider.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });

    divider.addEventListener("dblclick", () => {
      const requestPanel = document.getElementById("requestPanel");
      if (!this.prevHeight) {
        this.prevHeight = requestPanel.style.height || requestPanel.offsetHeight + "px";
        requestPanel.style.height = "44px";
      } else {
        requestPanel.style.height = this.prevHeight;
        this.prevHeight = null;
      }
    });
  },
};
