import { mkdirSync, writeFileSync } from "node:fs";
import { encodePng, enemySheet } from "../src/art/sheet.ts";

mkdirSync("art-sheet", { recursive: true });
writeFileSync("art-sheet/enemies.png", encodePng(enemySheet()));
console.log("wrote art-sheet/enemies.png");
