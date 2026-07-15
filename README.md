# Postman Lite

A lightweight browser-based API testing tool. Send HTTP requests, organize them into collections, manage environment variables, and view formatted responses — no database needed.

## Features

- **Tabbed interface** — Multiple requests open at once, each with its own state.
- **HTTP methods** — GET, POST, PUT, PATCH, DELETE, QUERY.
- **Request config** — Params, headers, body (JSON, raw, form-data, urlencoded).
- **Authorization** — Bearer Token, Basic Auth, API Key.
- **Collections** — Save with custom name, organize, search, rename, delete.
- **Environments** — Key-value variables with `{{VAR}}` substitution and autocomplete.
- **Drag & drop** — Drag variables into any field.
- **History** — Auto-saves every sent request.
- **Proxy architecture** — Backend relays requests to bypass CORS.
- **SSRF protection** — Private IPs blocked server-side.
- **Request timeout** — Configurable (default 30s).
- **Response viewer** — Formatted JSON, headers, cookies, timing, size.
- **JWT Inspector** — Auto-detects JWT responses and decodes header, payload, and signature inline.
- **Security Header Audit** — Checks responses for 6 security headers (CSP, HSTS, X-Frame-Options, etc.) with pass/fail indicators.
- **Schema Detector** — Extracts JSON structure with types from any JSON API response.
- **Dark theme** — VS Code-inspired UI.
- **Persistent storage** — Everything in localStorage.

## Installation

```bash
npm install
npm start
```

Open `http://localhost:5000`.

For development with auto-reload:
```bash
npm run dev
```

## Folder Structure

```
postman-lite/
├── package.json
├── server/
│   ├── server.js          # Express app
│   └── proxy.js           # /api/proxy — forwards requests
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── storage.js         # localStorage + helpers
│       ├── app.js             # Init, modals, sidebar
│       ├── requestBuilder.js  # Request form + send
│       ├── responseViewer.js  # Response display
│       ├── tabManager.js      # Tab bar + response caching
│       ├── collections.js     # Collections + search
│       ├── environments.js    # Environments + drag-drop
│       ├── history.js         # Request history
│       ├── layout.js          # Resize grips
│       └── autoComplete.js    # {{VAR}} dropdown
└── README.md
```

## Workflow

1. Build a request (method, URL, params, headers, body, auth).
2. Hit Send — the frontend resolves `{{VARS}}` and sends the request description to the backend proxy.
3. The proxy validates the URL (SSRF check), sets a timeout, and calls the target API.
4. Response is returned as JSON — status, headers, body, timing, size.
5. View formatted JSON, headers, cookies, security audit, or inferred schema in the response panel.

All data persists in `localStorage` across refreshes.
