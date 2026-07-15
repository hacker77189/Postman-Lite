// Side panel resize grip + the request/response panel divider.

const SidePanelGrip = {
  init() {
    const grip = document.querySelector(".side-panel-grip");
    if (!grip) return;

    let dragging = false, startX = 0, startW = 0;

    grip.addEventListener("mousedown", (e) => {
      dragging = true;
      startX = e.clientX;
      startW = document.getElementById("sidePanel").offsetWidth;
      grip.classList.add("active");
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const w = startW + (e.clientX - startX);
      const panel = document.getElementById("sidePanel");
      if (w < 80) {
        panel.classList.add("collapsed");
        document.querySelectorAll(".icon-btn[data-panel]").forEach(b => b.classList.remove("active"));
        dragging = false;
        grip.classList.remove("active");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    });

    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      grip.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });
  },
};

const DividerResizer = {
  init() {
    const div = document.getElementById("divider");
    let dragging = false, prevH = null;

    div.addEventListener("mousedown", (e) => {
      dragging = true;
      div.classList.add("active");
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const main = document.querySelector(".main");
      const rect = main.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const req = document.getElementById("requestPanel");
      req.style.height = Math.max(100, Math.min(y, rect.height - 60 - 4)) + "px";
    });

    document.addEventListener("mouseup", () => {
      if (!dragging) return;
      dragging = false;
      div.classList.remove("active");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    });

    // Double-click to collapse/expand the request panel.
    div.addEventListener("dblclick", () => {
      const req = document.getElementById("requestPanel");
      if (!prevH) {
        prevH = req.style.height || req.offsetHeight + "px";
        req.style.height = "44px";
      } else {
        req.style.height = prevH;
        prevH = null;
      }
    });
  },
};
