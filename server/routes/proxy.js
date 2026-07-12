// server/routes/proxy.js
//
// Single responsibility: take a request description sent by the browser,
// actually perform that HTTP request against the real target URL, time it,
// and return a clean JSON summary of what came back.
//
// Expected request body shape (sent BY our own frontend TO this route):
// {
//   method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "QUERY",
//   url: "https://example.com/users",
//   headers: { "Content-Type": "application/json", ... },   // plain object
//   body: "raw string body, or undefined for GET/QUERY-less requests"
// }

const express = require("express");
const router = express.Router();

// Methods that must never carry a body, per HTTP semantics.
// (QUERY is intentionally NOT in this list -- RFC 10008 defines QUERY as a
// method that carries a request body, similar to POST, but is safe/idempotent
// like GET. Node's fetch() has supported sending bodies with QUERY natively
// since Node 18, so no special-casing is needed beyond just not blocking it.)
const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

router.post("/proxy", async (req, res) => {
  const { method, url, headers = {}, body } = req.body;

  if (!method || !url) {
    return res.status(400).json({ error: "method and url are required" });
  }

  const fetchOptions = {
    method: method.toUpperCase(),
    headers,
  };

  // Only attach a body if the method actually supports one and the
  // caller actually sent something.
  if (!BODYLESS_METHODS.has(fetchOptions.method) && body !== undefined && body !== "") {
    fetchOptions.body = body;
  }

  const startTime = Date.now();

  try {
    const response = await fetch(url, fetchOptions);
    const responseText = await response.text();
    const elapsedMs = Date.now() - startTime;

    // Convert the Headers object into a plain object so it serializes to JSON cleanly.
    const responseHeaders = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return res.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseText,
      timeMs: elapsedMs,
      sizeBytes: Buffer.byteLength(responseText, "utf8"),
    });
  } catch (err) {
    // This branch covers network errors (DNS failure, connection refused,
    // timeout, invalid URL, etc.) -- NOT HTTP error status codes, which are
    // still a "successful" fetch as far as this code is concerned.
    const elapsedMs = Date.now() - startTime;
    return res.status(502).json({
      error: err.message,
      timeMs: elapsedMs,
    });
  }
});

module.exports = router;
