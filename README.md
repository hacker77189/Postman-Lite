# Postman Lite

A browser-based API testing tool inspired by Postman. Build and send HTTP requests, organize them into collections, manage environment variables with `{{VAR}}` substitution, and view formatted responses — all from a single-page app with no database required.

## Features

- **Tabbed request interface** — Open multiple requests in separate tabs, each with its own state.
- **HTTP methods** — GET, POST, PUT, PATCH, DELETE, QUERY.
- **Request configuration** — URL params, headers, body (JSON, raw text, form-data, x-www-form-urlencoded).
- **Authorization** — Bearer Token, Basic Auth, API Key (header or query param).
- **Collections** — Save, organize, search, and reload requests with rename/delete support.
- **Environments** — Create named environments with key-value variables. Use `{{VAR}}` syntax anywhere in the request builder.
- **Variable autocomplete** — Type `{{` to see a dropdown of available environment variables.
- **Drag & drop** — Drag environment variables from the sidebar into URL, header, body, or auth fields.
- **Request history** — Auto-saves every sent request with timestamps; clearable.
- **Proxy architecture** — The backend relays your requests to avoid CORS restrictions.
- **Response viewer** — Formatted JSON, raw headers, cookies, status codes, timing, and size.
- **Dark theme** — VS Code-inspired dark UI.
- **Persistent storage** — All data stays in the browser's localStorage (no database setup needed).

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in your browser
# Navigate to http://localhost:5000
```

For development with auto-reload on file changes:

```bash
npm run dev
```

## Folder Structure

```
postman-lite/
├── package.json          # Dependencies and scripts
├── server/
│   ├── index.js          # Express server — serves static files + mounts proxy
│   └── routes/
│       └── proxy.js      # /api/proxy — relays requests to target APIs
├── public/
│   ├── index.html        # Main HTML shell
│   ├── css/
│   │   └── style.css     # All styles (dark theme, layout, components)
│   └── js/
│       ├── storage.js         # localStorage abstraction + generateId helper
│       ├── environments.js    # Environment CRUD + {{VAR}} resolver
│       ├── collections.js     # Collection/request CRUD + sidebar tree
│       ├── history.js         # Request history list
│       ├── requestBuilder.js  # Request builder UI + Send flow
│       ├── responseViewer.js  # Response display (body, headers, cookies)
│       ├── sidePanelGrip.js   # Side panel resize grip
│       ├── collectionSearch.js   # Real-time collection search filter
│       ├── dividerResizer.js  # Request/response panel divider
│       ├── autoComplete.js    # {{VAR}} autocomplete dropdown
│       ├── dragDrop.js        # Drag-and-drop from env variables
│       ├── tabManager.js      # Request tab management
│       └── app.js             # App initialization and coordination
└── README.md
```

## Technologies Used

- **Frontend**: Vanilla JavaScript (ES6), CSS3, HTML5
- **Backend**: Node.js, Express.js 4.19
- **Storage**: Browser localStorage
- **HTTP**: Fetch API (browser) + Node.js `fetch` (server-side proxy)

No frameworks, bundlers, or databases were used — just plain JS in the spirit of a focused, zero-setup tool.

## Application Workflow

1. **User builds a request** in the request panel — selects method, enters URL, configures params/headers/body/auth.
2. **Hit Send** — the frontend assembles the request object, resolves any `{{VARIABLE}}` placeholders using the active environment, and POSTs the request description to `http://localhost:5000/api/proxy`.
3. **Proxy forwards the request** — the Express server receives the description and uses Node's built-in `fetch()` to perform the actual HTTP call against the target API. This bypasses browser CORS restrictions entirely.
4. **Response is returned** — the proxy captures the status, headers, body, timing, and size, then sends a clean JSON summary back to the browser.
5. **Response viewer renders it** — the frontend displays the formatted body (pretty-printed JSON), headers, and cookies with color-coded status.

All collections, environments, and history are persisted in `localStorage` and survive page refreshes without needing a database.

## Screenshots

*(Add screenshots here by placing image files in a `screenshots/` directory)*

---

Built for educational purposes as a lightweight, single-file-backend alternative to Postman.
