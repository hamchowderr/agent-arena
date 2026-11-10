import { mkdirSync, writeFileSync } from "node:fs";
import { animationSheet, bossSheet, encodePng, enemySheet } from "../src/art/sheet.ts";

mkdirSync("art-sheet", { recursive: true });
writeFileSync("art-sheet/enemies.png", encodePng(enemySheet()));
writeFileSync("art-sheet/animations.png", encodePng(animationSheet()));
writeFileSync("art-sheet/bosses.png", encodePng(bossSheet()));
console.log("wrote art-sheet/enemies.png, animations.png and bosses.png");
