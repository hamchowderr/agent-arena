import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import noComments from "./eslint/no-comments.js";

const local = { rules: { "no-comments": noComments } };

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "coverage/"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { local },
    rules: {
      "local/no-comments": "error",
    },
  },
  {
    files: ["src/sim/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "Date", message: "The sim must be deterministic: take time as an input." },
        { name: "performance", message: "The sim must be deterministic: take time as an input." },
        { name: "setTimeout", message: "The sim runs on ticks, not timers." },
        { name: "setInterval", message: "The sim runs on ticks, not timers." },
        { name: "requestAnimationFrame", message: "Rendering lives outside the sim." },
        { name: "document", message: "The sim must not touch the DOM." },
        { name: "window", message: "The sim must not touch the DOM." },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Use createRng(seed) so fights replay exactly." },
      ],
    },
  },
);
