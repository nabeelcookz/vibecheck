// Zero-dependency local server: serves /public and runs the /api handlers the same way Vercel does.
// Usage: npm run dev  (or: node --env-file-if-exists=.env scripts/dev-server.js)   (Node 22.9+)
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".webmanifest": "application/manifest+json" };
const ROUTES = { "/api/charts": "charts", "/api/picks": "picks", "/api/youtube": "youtube", "/api/playlist": "playlist" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = ROUTES[url.pathname];
  if (route) {
    req.query = Object.fromEntries(url.searchParams);
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
    const { default: handler } = await import(`../api/${route}.js`);
    return handler(req, res);
  }
  const path = normalize(join(root, "public", url.pathname === "/" ? "index.html" : url.pathname));
  if (!path.startsWith(join(root, "public"))) { res.statusCode = 403; return res.end(); }
  try {
    const body = await readFile(path);
    res.setHeader("content-type", TYPES[extname(path)] || "application/octet-stream");
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}).listen(PORT, () => console.log(`Vibecheck running at http://localhost:${PORT}`));
