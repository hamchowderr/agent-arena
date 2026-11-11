import { defineConfig } from "vitest/config";
import { DOMAIN, fillSiteUrl } from "./src/site/site-url";

const STRUDEL_PACKAGES = /node_modules\/(@strudel|@kabelsalat|superdough|fraction\.js|nanostores|supradough)\//;
const THREE_PACKAGE = /node_modules\/three\//;

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "site-url",
      transformIndexHtml: (html) => fillSiteUrl(html),
      generateBundle() {
        this.emitFile({ type: "asset", fileName: "CNAME", source: `${DOMAIN}\n` });
      },
    },
  ],
  resolve: {
    alias: {
      "pixelfx/core": new URL("./vendor/pixelfx/src/core/index.js", import.meta.url).pathname,
      "pixelfx/fx": new URL("./vendor/pixelfx/src/fx", import.meta.url).pathname,
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    manifest: true,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id) => (STRUDEL_PACKAGES.test(id) ? "strudel" : THREE_PACKAGE.test(id) ? "three" : undefined),
      },
    },
  },
  test: {
    server: { deps: { inline: [/@strudel/, /@kabelsalat/] } },
    alias: {
      "@kabelsalat/web": new URL("./node_modules/@kabelsalat/web/dist/index.mjs", import.meta.url).pathname,
    },
  },
});
