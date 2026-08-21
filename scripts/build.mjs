import { cp, mkdir, rm, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "public");
const output = resolve(root, "dist");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

for (const route of ["terms", "privacy", "help"]) {
  const routeDirectory = resolve(output, route);
  await mkdir(routeDirectory, { recursive: true });
  await copyFile(resolve(source, "pages", `${route}.html`), resolve(routeDirectory, "index.html"));
}

console.log("Recovered Pinoy Pocket Budget build created in dist/.");
