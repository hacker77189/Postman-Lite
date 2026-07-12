// public/js/collectionSearch.js
//
// Filters the collections list in real-time as the user types in the
// search bar. Delegates to Collections.renderList() with a search filter.
//
const CollectionSearch = {
  init() {
    const input = document.getElementById("collectionSearch");
    input.addEventListener("input", () => {
      Collections.renderList(input.value.trim().toLowerCase());
    });
  },
};
