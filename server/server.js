const express = require("express");
const path = require("path");

const proxy = require("./proxy");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api", proxy);

app.listen(PORT, () => {
  console.log(`Postman Lite running at http://localhost:${PORT}`);
});
