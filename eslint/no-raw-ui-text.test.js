import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import rule from "./no-raw-ui-text.js";

RuleTester.describe = describe;
RuleTester.it = it;

new RuleTester().run("no-raw-ui-text", rule, {
  valid: [
    'text(context, t("hud.boss"), 0, 0, 18);',
    "text(context, `${a} → ${b}`, 0, 0, 18);",
    'text(context, "★", 0, 0, 18);',
    'const banner = { title: t("story.worldCleared"), subtitle: "" };',
    'drawButton(context, rect, t("levelUp.skip", { count: 2 }), true);',
    'fill("#9fb0d0");',
  ],
  invalid: [
    { code: 'text(context, "Boss", 0, 0, 18);', errors: [{ messageId: "rawText" }] },
    { code: "text(context, `LV ${level}`, 0, 0, 18);", errors: [{ messageId: "rawText" }] },
    { code: 'text(context, won ? "You win" : t("results.lostTitle"), 0, 0, 18);', errors: [{ messageId: "rawText" }] },
    { code: 'const banner = { title: "World cleared" };', errors: [{ messageId: "rawText" }] },
    { code: 'drawButton(context, rect, "Skip", true);', errors: [{ messageId: "rawText" }] },
    { code: 'wrap(context, "Some words", 100, 16);', errors: [{ messageId: "rawText" }] },
  ],
});
