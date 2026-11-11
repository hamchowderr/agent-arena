import { mkdirSync, writeFileSync } from "node:fs";
import { animationSheet, bossSheet, encodePng, enemySheet, evolutionSheet, pickupSheet, shotSheet } from "../src/art/sheet.ts";

mkdirSync("art-sheet", { recursive: true });
writeFileSync("art-sheet/enemies.png", encodePng(enemySheet()));
writeFileSync("art-sheet/animations.png", encodePng(animationSheet()));
writeFileSync("art-sheet/bosses.png", encodePng(bossSheet()));
writeFileSync("art-sheet/weapons.png", encodePng(pickupSheet()));
writeFileSync("art-sheet/evolution.png", encodePng(evolutionSheet()));
writeFileSync("art-sheet/shots.png", encodePng(shotSheet()));
console.log("wrote art-sheet/enemies.png, animations.png, bosses.png, weapons.png, evolution.png and shots.png");
