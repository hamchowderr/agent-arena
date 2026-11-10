import { mkdirSync, writeFileSync } from "node:fs";
import { animationSheet, encodePng, enemySheet } from "../src/art/sheet.ts";

mkdirSync("art-sheet", { recursive: true });
writeFileSync("art-sheet/enemies.png", encodePng(enemySheet()));
writeFileSync("art-sheet/animations.png", encodePng(animationSheet()));
console.log("wrote art-sheet/enemies.png and art-sheet/animations.png");
