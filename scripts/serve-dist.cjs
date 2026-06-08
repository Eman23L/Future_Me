const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const host = "127.0.0.1";
const port = Number(process.env.PORT || 5173);
const distDir = path.resolve(__dirname, "..", "dist");

const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const devServiceWorker = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
    const clientsList = await self.clients.matchAll({ type: "window" });
    clientsList.forEach((client) => client.navigate(client.url));
  })());
});
`;

function send(res, status, body, type) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  const candidate = path.resolve(distDir, relativePath);

  if (!candidate.startsWith(distDir)) {
    return path.join(distDir, "index.html");
  }

  return fs.existsSync(candidate) && fs.statSync(candidate).isFile()
    ? candidate
    : path.join(distDir, "index.html");
}

const server = http.createServer((req, res) => {
  if (req.url && req.url.split("?")[0] === "/sw.js") {
    send(res, 200, devServiceWorker, "text/javascript; charset=utf-8");
    return;
  }

  const filePath = resolveFile(req.url || "/");
  const ext = path.extname(filePath);
  send(res, 200, fs.readFileSync(filePath), types[ext] || "application/octet-stream");
});

server.listen(port, host, () => {
  console.log(`Future Me running at http://${host}:${port}/`);
});
