// server/index.js
//
// This is the entire backend. It does exactly two jobs:
//   1. Serve the static frontend (HTML/CSS/JS) from the `public` folder.
//   2. Expose a single /api/proxy route that forwards whatever request
//      the browser asks it to make to the real target API.
//
// Why do we need step 2 at all? Because a browser blocks cross-origin
// fetch() calls via CORS. Our Express server is not a browser -- it's a
// plain Node process -- so it can call any API directly with no CORS
// restriction. The browser only ever talks to OUR server (same-origin),
// and our server relays the real request on its behalf.

const express = require("express");
const path = require("path");
const proxyRouter = require("./routes/proxy");

const app = express();
const PORT = process.env.PORT || 5000;

// Parse incoming JSON bodies (this is the JSON the BROWSER sends to US,
// describing what request it wants proxied -- not the target API's body).
app.use(express.json({ limit: "10mb" }));

// Serve the frontend as static files.
app.use(express.static(path.join(__dirname, "..", "public")));

// Mount the proxy route under /api.
app.use("/api", proxyRouter);

app.listen(PORT, () => {
  console.log(`Postman Lite running at http://localhost:${PORT}`);
});
