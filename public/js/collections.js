// public/js/collections.js
//
// Manages saved request collections: create, rename, delete collections and
// the requests within them. Renders the collapsible tree in the sidebar.
//
const Collections = {
  expandedState: {},

  create(name) {
    const collections = Storage.getCollections();
    const newCollection = { id: generateId("col"), name, requests: [] };
    collections.push(newCollection);
    Storage.saveCollections(collections);
    return newCollection;
  },

  renameCollection(id, newName) {
    const collections = Storage.getCollections();
    const col = collections.find((c) => c.id === id);
    if (col) { col.name = newName; Storage.saveCollections(collections); }
  },

  deleteCollection(id) {
    if (!confirm("Delete this collection and all its requests?")) return;
    const collections = Storage.getCollections();
    Storage.saveCollections(collections.filter((c) => c.id !== id));
    this.renderList();
  },

  addRequestToCollection(collectionId, name, requestData) {
    const collections = Storage.getCollections();
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;
    collection.requests.push({ id: generateId("req"), name, request: requestData });
    Storage.saveCollections(collections);
  },

  renameRequest(collectionId, requestId, newName) {
    const collections = Storage.getCollections();
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return;
    const req = col.requests.find((r) => r.id === requestId);
    if (req) { req.name = newName; Storage.saveCollections(collections); }
  },

  deleteRequest(collectionId, requestId) {
    if (!confirm("Delete this request?")) return;
    const collections = Storage.getCollections();
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return;
    col.requests = col.requests.filter((r) => r.id !== requestId);
    Storage.saveCollections(collections);
    this.renderList();
  },

  findRequest(collectionId, requestId) {
    const collections = Storage.getCollections();
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return null;
    return collection.requests.find((r) => r.id === requestId) || null;
  },

  renderList(searchFilter) {
    const container = document.getElementById("collectionsList");
    const collections = Storage.getCollections();
    const self = this;
    container.innerHTML = "";

    if (!collections.length) {
      container.innerHTML = '<div class="history-empty">No collections yet.</div>';
      return;
    }

    collections.forEach((collection) => {
      if (!(collection.id in this.expandedState)) {
        this.expandedState[collection.id] = true;
      }
      const isExpanded = this.expandedState[collection.id];

      const filteredRequests = searchFilter
        ? collection.requests.filter(
            (r) =>
              r.name.toLowerCase().includes(searchFilter) ||
              (r.request.method || "").toLowerCase().includes(searchFilter) ||
              (r.request.url || "").toLowerCase().includes(searchFilter)
          )
        : collection.requests;

      if (searchFilter && !collection.name.toLowerCase().includes(searchFilter) && !filteredRequests.length) {
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.className = "collection-item";

      const nameEl = document.createElement("div");
      nameEl.className = `collection-name${isExpanded ? " expanded" : ""}`;

      const toggleArrow = document.createElement("span");
      toggleArrow.className = "toggle-arrow";
      toggleArrow.textContent = "▶";
      nameEl.appendChild(toggleArrow);

      const nameSpan = document.createElement("span");
      nameSpan.textContent = collection.name;
      nameSpan.className = "coll-name-text";
      nameEl.appendChild(nameSpan);

      const addBtn = document.createElement("button");
      addBtn.className = "coll-add-req-btn";
      addBtn.textContent = "+";
      addBtn.title = "Add request";
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showNewRequestRow(wrapper, collection.id, searchFilter);
      });
      nameEl.appendChild(addBtn);

      const delBtn = document.createElement("button");
      delBtn.className = "coll-delete-btn";
      delBtn.textContent = "×";
      delBtn.title = "Delete collection";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        self.deleteCollection(collection.id);
      });
      nameEl.appendChild(delBtn);

      nameSpan.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        const input = document.createElement("input");
        input.className = "inline-rename-input";
        input.value = collection.name;
        nameSpan.replaceWith(input);
        input.focus();
        input.select();
        const finish = () => {
          const val = input.value.trim();
          if (val && val !== collection.name) {
            self.renameCollection(collection.id, val);
            self.renderList(searchFilter);
          } else {
            self.renderList(searchFilter);
          }
        };
        input.addEventListener("blur", finish);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); input.blur(); }
          if (e.key === "Escape") { input.value = collection.name; input.blur(); }
        });
      });

      nameEl.addEventListener("click", (e) => {
        if (e.target.closest("button")) return;
        if (e.target.closest("input")) return;
        self.expandedState[collection.id] = !self.expandedState[collection.id];
        self.renderList(searchFilter);
      });
      wrapper.appendChild(nameEl);

      const newReqRow = document.createElement("div");
      newReqRow.className = "inline-create-row";
      newReqRow.style.display = "none";
      newReqRow.innerHTML = `
        <input type="text" class="new-req-name-input" placeholder="Request name" />
        <button class="btn-small btn-confirm">✓</button>
        <button class="btn-small btn-cancel">✕</button>
      `;
      wrapper.appendChild(newReqRow);

      if (isExpanded) {
        const requestsWrapper = document.createElement("div");
        requestsWrapper.className = "collection-requests";

        if (!filteredRequests.length) {
          const empty = document.createElement("div");
          empty.className = "history-empty";
          empty.style.marginLeft = "12px";
          empty.textContent = searchFilter ? "No matching requests." : "No saved requests yet.";
          requestsWrapper.appendChild(empty);
        }

        filteredRequests.forEach((savedReq) => {
          const reqEl = document.createElement("div");
          reqEl.className = "request-item";
          const method = savedReq.request.method || "GET";

          const badge = document.createElement("span");
          badge.className = `method-badge method-${method}`;
          badge.textContent = method;
          reqEl.appendChild(badge);

          const reqNameSpan = document.createElement("span");
          reqNameSpan.textContent = savedReq.name;
          reqNameSpan.className = "req-name-text";
          reqEl.appendChild(reqNameSpan);

          const reqDelBtn = document.createElement("button");
          reqDelBtn.className = "req-delete-btn";
          reqDelBtn.textContent = "×";
          reqDelBtn.title = "Delete request";
          reqDelBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            self.deleteRequest(collection.id, savedReq.id);
          });
          reqEl.appendChild(reqDelBtn);

          reqNameSpan.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            const input = document.createElement("input");
            input.className = "inline-rename-input";
            input.value = savedReq.name;
            reqNameSpan.replaceWith(input);
            input.focus();
            input.select();
            const finish = () => {
              const val = input.value.trim();
              if (val && val !== savedReq.name) {
                self.renameRequest(collection.id, savedReq.id, val);
                self.renderList(searchFilter);
              } else {
                self.renderList(searchFilter);
              }
            };
            input.addEventListener("blur", finish);
            input.addEventListener("keydown", (e) => {
              if (e.key === "Enter") { e.preventDefault(); input.blur(); }
              if (e.key === "Escape") { input.value = savedReq.name; input.blur(); }
            });
          });

          reqEl.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest("input")) return;
            if (typeof TabsManager !== "undefined") {
              TabsManager.openTab(method, savedReq.name, savedReq.request);
            } else {
              RequestBuilder.loadRequest(savedReq.request);
            }
          });
          requestsWrapper.appendChild(reqEl);
        });

        wrapper.appendChild(requestsWrapper);
      }

      container.appendChild(wrapper);
    });
  },
};

function showNewRequestRow(wrapper, collectionId, searchFilter) {
  const row = wrapper.querySelector(".inline-create-row");
  if (!row) return;
  row.style.display = "flex";
  const input = row.querySelector(".new-req-name-input");
  const confirmBtn = row.querySelector(".btn-confirm");
  const cancelBtn = row.querySelector(".btn-cancel");

  input.value = "";
  input.focus();

  const confirm = () => {
    const name = input.value.trim() || "New Request";
    const emptyReq = { method: "GET", url: "", params: [], headers: [], bodyMode: "none", bodyRaw: "", bodyFields: [], auth: { type: "none" } };
    Collections.addRequestToCollection(collectionId, name, emptyReq);
    if (typeof TabsManager !== "undefined") {
      TabsManager.openTab("GET", name, emptyReq);
    }
    row.style.display = "none";
    Collections.renderList(searchFilter);
  };

  const cancel = () => {
    row.style.display = "none";
  };

  confirmBtn.onclick = confirm;
  cancelBtn.onclick = cancel;
  input.onkeydown = (e) => {
    if (e.key === "Enter") confirm();
    if (e.key === "Escape") cancel();
  };
}
