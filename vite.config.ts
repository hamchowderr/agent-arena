import { defineConfig } from "vitest/config";

const STRUDEL_PACKAGES = /node_modules\/(@strudel|@kabelsalat|superdough|fraction\.js|nanostores|supradough)\//;

export default defineConfig({
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => (STRUDEL_PACKAGES.test(id) ? "strudel" : undefined),
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
