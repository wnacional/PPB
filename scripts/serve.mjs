import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

const requestedRoot = process.argv[2] ?? "public";
const root = resolve(import.meta.dirname, "..", requestedRoot);
const port = Number(process.env.PORT ?? 4173);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json"
};

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const pathname = decodeURIComponent(url.pathname);
  const routeName = pathname.replace(/^\/+|\/+$/g, "");
  const candidates = [
    resolve(root, `.${pathname}`),
    resolve(root, routeName, "index.html"),
    resolve(root, "pages", `${routeName}.html`),
    resolve(root, "index.html")
  ];

  const file = candidates.find((candidate) =>
    candidate.startsWith(root) && existsSync(candidate) && statSync(candidate).isFile()
  );

  if (!file) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-store"
  });
  createReadStream(file).pipe(response);
}).listen(port, "0.0.0.0", () => {
  console.log(`Recovered app available on port ${port}`);
});
