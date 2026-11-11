import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const INITIAL_BUDGET_BYTES = 124 * 1024;
const LAZY_BUDGET_BYTES = 200 * 1024;
const UNBUDGETED_LAZY_PREFIXES = ["strudel"];
const dist = join(process.cwd(), "dist");
const manifest = JSON.parse(readFileSync(join(dist, ".vite", "manifest.json"), "utf8"));

const html = readFileSync(join(dist, "index.html"), "utf8");
if (html.includes("%SITE_URL%")) {
  console.error("dist/index.html still has %SITE_URL% in it. The site-url plugin in vite.config.ts did not run.");
  process.exit(1);
}

const rootPaths = html.match(/(?:src|href)="\/(?!\/)[^"]*"/g) ?? [];
if (rootPaths.length > 0) {
  console.error(`dist/index.html links from the site root, which breaks the build whenever it is opened from a subpath or a file: ${rootPaths.join(", ")}`);
  process.exit(1);
}

const gzipped = (file) => gzipSync(readFileSync(join(dist, file))).length;
const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const initial = new Set();
const visit = (key) => {
  const chunk = manifest[key];
  if (!chunk || initial.has(chunk.file)) {
    return;
  }
  initial.add(chunk.file);
  for (const css of chunk.css ?? []) {
    initial.add(css);
  }
  for (const imported of chunk.imports ?? []) {
    visit(imported);
  }
};
for (const [key, chunk] of Object.entries(manifest)) {
  if (chunk.isEntry) {
    visit(key);
  }
}

const initialBytes = [...initial].reduce((sum, file) => sum + gzipped(file), 0);
console.log(`Initial download: ${kb(initialBytes)} gzipped (budget ${kb(INITIAL_BUDGET_BYTES)}) across ${initial.size} files`);
let failed = initialBytes > INITIAL_BUDGET_BYTES;

for (const chunk of Object.values(manifest)) {
  const name = chunk.file.split("/").pop() ?? chunk.file;
  if (initial.has(chunk.file) || !chunk.file.endsWith(".js") || UNBUDGETED_LAZY_PREFIXES.some((prefix) => name.startsWith(prefix))) {
    continue;
  }
  const bytes = gzipped(chunk.file);
  console.log(`Lazy chunk ${name}: ${kb(bytes)} gzipped (budget ${kb(LAZY_BUDGET_BYTES)})`);
  failed ||= bytes > LAZY_BUDGET_BYTES;
}

if (failed) {
  console.error("Over the size budget. Cut code or split it into a smaller lazy chunk.");
  process.exit(1);
}
