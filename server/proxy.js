const express = require("express");
const { URL } = require("url");
const dns = require("dns/promises");
const net = require("net");

const router = express.Router();

// Methods that never carry a body.
const BODYLESS = new Set(["GET", "HEAD"]);

function isPrivateIP(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    if (p[0] === 10) return true;
    if (p[0] === 127) return true;
    if (p[0] === 0) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
    if (p[0] === 198 && p[1] === 18) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    return false;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  return false;
}

// Prevent SSRF: resolve the hostname and reject if it maps to a private IP.
async function validateUrl(raw) {
  let parsed;
  try { parsed = new URL(raw); } catch { throw new Error("Invalid URL"); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https allowed");
  }

  const host = parsed.hostname;

  if (net.isIP(host)) {
    if (isPrivateIP(host)) throw new Error("Private addresses not allowed");
    return;
  }

  try {
    const addrs = await dns.resolve(host);
    for (const a of addrs) {
      if (isPrivateIP(a)) throw new Error("Private addresses not allowed");
    }
  } catch (e) {
    // Only surface our own rejection; let unknown DNS failures pass through.
    if (e.message === "Private addresses not allowed") throw e;
  }
}

function buildMultipart(fields) {
  const boundary = "----PLBoundary" + Math.random().toString(36).slice(2);
  const parts = fields.filter(f => f.key).map(f => {
    return `--${boundary}\r\nContent-Disposition: form-data; name="${f.key}"\r\nContent-Type: text/plain\r\n\r\n${f.value || ""}`;
  });
  parts.push(`--${boundary}--`);
  return { body: parts.join("\r\n"), boundary };
}

router.post("/proxy", async (req, res) => {
  const { method, url, headers = {}, body, followRedirects, timeout, bodyMode, bodyFields } = req.body;
  if (!method || !url) return res.status(400).json({ error: "method and url required" });

  try { await validateUrl(url); } catch (e) { return res.status(400).json({ error: e.message }); }

  const opts = { method: method.toUpperCase(), headers: { ...headers } };

  if (followRedirects === false) opts.redirect = "manual";

  let reqBody = body;

  // Build proper multipart body client-side form-data mode.
  if (bodyMode === "form-data" && bodyFields?.length) {
    const mp = buildMultipart(bodyFields);
    reqBody = mp.body;
    opts.headers["Content-Type"] = `multipart/form-data; boundary=${mp.boundary}`;
  }

  if (!BODYLESS.has(opts.method) && reqBody !== undefined && reqBody !== "") {
    opts.body = reqBody;
  }

  const ms = (typeof timeout === "number" && timeout > 0) ? timeout : 30000;
  const ctrl = new AbortController();
  opts.signal = ctrl.signal;
  const timer = setTimeout(() => ctrl.abort(), ms);

  const t0 = Date.now();
  try {
    const resp = await fetch(url, opts);
    clearTimeout(timer);
    const text = await resp.text();
    const hdrs = {};
    resp.headers.forEach((v, k) => { hdrs[k] = v; });
    res.json({
      status: resp.status, statusText: resp.statusText,
      headers: hdrs, body: text,
      timeMs: Date.now() - t0, sizeBytes: Buffer.byteLength(text, "utf8"),
    });
  } catch (err) {
    clearTimeout(timer);
    const msg = err.name === "AbortError" ? `Timed out after ${ms}ms` : err.message;
    res.status(502).json({ error: msg, timeMs: Date.now() - t0 });
  }
});

module.exports = router;
