// public/js/sidePanelGrip.js
//
// Handles the side panel resizing grip: dragging the edge collapses or
// resizes the collections/environments/history sidebar.
//
const SidePanelGrip = {
  isDragging: false,
  startX: 0,
  panelStartWidth: 0,

  init() {
    const grip = document.querySelector(".side-panel-grip");
    if (!grip) return;

    grip.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.startX = e.clientX;
      const panel = document.getElementById("sidePanel");
      this.panelStartWidth = panel.offsetWidth;
      grip.classList.add("active");
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.startX;
      const panel = document.getElementById("sidePanel");
      const newWidth = this.panelStartWidth + dx;

      if (newWidth < 80) {
        panel.classList.add("collapsed");
        document.querySelectorAll(".icon-btn[data-panel]").forEach((b) => b.classList.remove("active"));
        this.isDragging = false;
        document.querySelector(".side-panel-grip")?.classList.remove("active");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    });

    document.addEventListener("mouseup", () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      document.querySelector(".side-panel-grip")?.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });
  },
};
