import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_BYTES = 124 * 1024;
const LAZY_CHUNK_PREFIXES = ["strudel"];
const assetsDir = join(process.cwd(), "dist", "assets");

const files = readdirSync(assetsDir).filter((file) => file.endsWith(".js") || file.endsWith(".css"));
const counted = files.filter((file) => !LAZY_CHUNK_PREFIXES.some((prefix) => file.startsWith(prefix)));
const total = counted.reduce((sum, file) => sum + gzipSync(readFileSync(join(assetsDir, file))).length, 0);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
console.log(`Initial bundle: ${kb(total)} gzipped (budget ${kb(BUDGET_BYTES)}) across ${counted.length} files`);

if (total > BUDGET_BYTES) {
  console.error("Over the size budget. Cut code or move it into a lazy-loaded chunk.");
  process.exit(1);
}
