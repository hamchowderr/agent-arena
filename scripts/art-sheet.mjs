import { mkdirSync, writeFileSync } from "node:fs";
import { animationSheet, bossSheet, encodePng, enemySheet, evolutionSheet, pickupSheet } from "../src/art/sheet.ts";

mkdirSync("art-sheet", { recursive: true });
writeFileSync("art-sheet/enemies.png", encodePng(enemySheet()));
writeFileSync("art-sheet/animations.png", encodePng(animationSheet()));
writeFileSync("art-sheet/bosses.png", encodePng(bossSheet()));
writeFileSync("art-sheet/weapons.png", encodePng(pickupSheet()));
writeFileSync("art-sheet/evolution.png", encodePng(evolutionSheet()));
console.log("wrote art-sheet/enemies.png, animations.png, bosses.png, weapons.png and evolution.png");
