import type { Sprite } from "./sprites";

export { FACTION_KEY } from "./shade";

export const GRUNT: Sprite = [
  ".......m......",
  ".......k......",
  "....kkkkkk....",
  "..kkXXXXXXkk..",
  ".kXXXXXXXXXXk.",
  ".kXXwwXXXwwXk.",
  "kXXXwkXXXwkXXk",
  "kXXXXXXXXXXXXk",
  "kXXXXXkkkXXXXk",
  ".kXXXXXXXXXXk.",
  "..kkXXXXXXkk..",
  ".kXXkkkkkk....",
  ".kk...........",
];

export const RUNNER: Sprite = [
  "..............",
  ".....kkkkk....",
  "....kXXXXXk...",
  "...kXXwwXXXk..",
  "..kXXXwkXXXXk.",
  "sskXXXXXXXXXk.",
  "..kXXXXXyyyXk.",
  "sskXXXXXXXXk..",
  "...kkXXXXkk...",
  "..kXk.kXk.....",
  "..kk...kk.....",
  "..............",
];

export const BRUTE: Sprite = [
  "..................",
  "...kkkkkkkkkkkk...",
  "..kXXXXXXXXXXXXk..",
  ".kXXXXXXXXXXXXXXk.",
  ".kXXwwwXXXXwwwXXk.",
  ".kXXwkkXXXXwkkXXk.",
  ".kXXXXXXXXXXXXXXk.",
  "kkXXXXkkkkkkXXXXkk",
  "kXkXXkyyyyyykXXkXk",
  "kXkXXkkkkkkkkXXkXk",
  "kXkXXXXXXXXXXXXkXk",
  ".kkXXXXXXXXXXXXkk.",
  "..kXXXXXXXXXXXXk..",
  "..kXXXXkkkkXXXXk..",
  "..kXXXk....kXXXk..",
  "..kkkkk....kkkkk..",
];

export const CHARGER: Sprite = [
  ".k............k.",
  ".kk..........kk.",
  "..kk.kkkkkk.kk..",
  "...kkXXXXXXkk...",
  "..kXXXXXXXXXXk..",
  ".kXXXwwXXwwXXXk.",
  "kXXXXkwXXkwXXXXk",
  "kXXXXXXXXXXXXXXk",
  "kXXXXXkkkkXXXXXk",
  ".kXXXXyyyyXXXXk.",
  "..kkXXXXXXXXkk..",
  "..kXXkkkkkkXXk..",
  "..kkk......kkk..",
];

export const SHOOTER: Sprite = [
  "..............",
  "...kkkkkkkk...",
  "..kXXXXXXXXk..",
  ".kXXwwXXwwXXk.",
  ".kXXwkXXwkXXk.",
  ".kXXXXXXXXXXk.",
  ".kSSSSSSSSSSk.",
  ".kSkkkkkkkkSk.",
  ".kSkooooookSk.",
  ".kSkkkkkkkkSk.",
  ".kXXXXXXXXXXk.",
  "..kXXkkkkXXk..",
  "..kXk....kXk..",
  "..kk......kk..",
];

export const EXPLODER: Sprite = [
  ".........y....",
  "........yoy...",
  ".......kk.....",
  "......kk......",
  "....kkkkkk....",
  "..kkXXXXXXkk..",
  ".kXXwXXXXXXXk.",
  ".kXwwXkXXkXXk.",
  "kXXXXXkXXkXXXk",
  "kXXXXXXXXXXXXk",
  "kXXXXkkkkkXXXk",
  ".kXXXXXXXXXXk.",
  "..kkXXXXXXkk..",
  "....kkkkkk....",
];

export const SPLITTER: Sprite = [
  "................",
  "....kkkk.kkkk...",
  "..kkXXXXkXXXXkk.",
  ".kXXXXXXkXXXXXXk",
  ".kXwwXXXkXXwwXXk",
  "kXXwkXXXkXXwkXXk",
  "kXXXXXXXkXXXXXXk",
  "kXXXXXXwkwXXXXXk",
  "kXXXyyXXkXXyyXXk",
  "kXXXXXXwkwXXXXXk",
  ".kXXXXXXkXXXXXk.",
  "..kkXXXXkXXXXk..",
  "...kXkkkkkkXk...",
  "...kk......kk...",
];

export const HEAVY: Sprite = [
  "........................",
  "...kkkkkkkkkkkkkkkkkk...",
  "..kXXXXXXXXXXXXXXXXXXk..",
  "..kXddddddddddddddddXk..",
  "..kXdmmdddddddddmmddXk..",
  "..kXdwmdddddddddwmddXk..",
  "..kXddddddddddddddddXk..",
  "..kXXXXXXXXXXXXXXXXXXk..",
  ".kkXSSSSSSSSSSSSSSSSXkk.",
  "kXXkSdddddddddddddySkXXk",
  "kXXkSSSSSSSSSSSSSSSSkXXk",
  "kXXkSddddddddddddddSkXXk",
  "kXXkSSSSSSSSSSSSSSSSkXXk",
  "kXXkSdddddddddddddgSkXXk",
  ".kkkSSSSSSSSSSSSSSSSkkk.",
  "...kXXXXXXXXXXXXXXXXk...",
  "...kXXXXXXXXXXXXXXXXk...",
  "...kkkkkkkkkkkkkkkkkk...",
  "....kXXXXk....kXXXXk....",
  "....kXXXXk....kXXXXk....",
  "....kkkkkk....kkkkkk....",
];

export const LOOT_RUNNER: Sprite = [
  ".....w........",
  "....kkkk......",
  "...kooook..w..",
  "..kyyyyyyk....",
  ".kyyoyyoyyk...",
  "kyyyyyyyyyyk..",
  "kyywkyywkyyk..",
  "kyyyyyyyyyyk..",
  "kyyyyokkyyyyk.",
  ".kyyyyyyyyyk..",
  "..kkyyyyyykk..",
  "..kyk.kyk.....",
  "..kk..kk......",
];

export const CHEST: Sprite = [
  "..kkkkkkkkkk..",
  ".kooooooooook.",
  "kooyyyyyyyyook",
  "kooooooooooook",
  "kkkkkkkkkkkkkk",
  "koooookkooooko",
  "kyyyykyoykyyyk",
  "koooookkooooko",
  "kooooooooooook",
  ".kkkkkkkkkkkk.",
];

export const BOSS: Sprite = [
  ".......y...y...y.......",
  ".......yy.yyy.yy.......",
  ".......yyyyyyyyy.......",
  ".......kkkkkkkkk.......",
  ".....kkXXXXXXXXXkk.....",
  "....kXXXXXXXXXXXXXk....",
  "...kXXXXXXXXXXXXXXXk...",
  "...kXdddddddddddddXk...",
  "...kXdmmmdddddmmmdXk...",
  "...kXdmwmdddddmwmdXk...",
  "...kXdddddddddddddXk...",
  "...kXXXXXkkkkkXXXXXk...",
  "....kXXXXXXXXXXXXXk....",
  "..kkkSSSSkwwwkSSSSkkk..",
  ".kXXkSSSSSkrkSSSSSkXXk.",
  "kXXXkSSSSSkrkSSSSSkXXXk",
  "kXXkkSSSSkrrrkSSSSkkXXk",
  "kXXk.kSSSkrrrkSSSk.kXXk",
  ".kk..kSSSSkrkSSSSk..kk.",
  ".....kSSSSSkSSSSSk.....",
  ".....kSSSSkkkSSSSk.....",
  ".....kXXXk...kXXXk.....",
  ".....kkkkk...kkkkk.....",
];

export const ENEMY_SHOT: Sprite = [".kkk.", "kroyk", "kowok", "kroyk", ".kkk."];

export const HAZARD: Sprite = [
  "..........pppppp..........",
  ".......pppppppppppp.......",
  ".....pppppXXXXXXppppp.....",
  "....ppppXXXXXXXXXXpppp....",
  "...pppXXXXXwwXXXXXXXppp...",
  "..pppXXXXXXwwXXXXXXXXppp..",
  ".pppXXXXXXXXXXXXXXwwXXppp.",
  ".ppXXXXXXXXXXXXXXXwwXXXpp.",
  "pppXXXXwwXXXXXXXXXXXXXXppp",
  "ppXXXXXwwXXXXXXXXXXXXXXXpp",
  "ppXXXXXXXXXXXXXXXXXXXXXXpp",
  "ppXXXXXXXXXXXXwwXXXXXXXXpp",
  "ppXXXXXXXXXXXXwwXXXXXXXXpp",
  "ppXXXXXXXXXXXXXXXXXXXXXXpp",
  "ppXXXwwXXXXXXXXXXXXXXXXXpp",
  "ppXXXwwXXXXXXXXXXXXwwXXXpp",
  "pppXXXXXXXXXXXXXXXXwwXXppp",
  ".ppXXXXXXXXXXXXXXXXXXXXpp.",
  ".pppXXXXXXXXwwXXXXXXXXppp.",
  "..pppXXXXXXXwwXXXXXXXppp..",
  "...pppXXXXXXXXXXXXXXppp...",
  "....ppppXXXXXXXXXXpppp....",
  ".....pppppXXXXXXppppp.....",
  ".......pppppppppppp.......",
  "..........pppppp..........",
  "..........................",
];

export const GEM: Sprite = ["..m..", ".mcm.", "mcwcm", ".mcm.", "..m.."];

export const BIG_GEM: Sprite = ["...y...", "..yoy..", ".yowoy.", "yowwwoy", ".yowoy.", "..yoy..", "...y..."];

export const BOLT: Sprite = ["..yy..", ".yooy.", "yowwoy", "yowwoy", ".yooy.", "..yy.."];

export const BEAM: Sprite = ["....mmmmmmmm", "..mmccccccww", "mmcccwwwwwww", "..mmccccccww", "....mmmmmmmm"];

export const SEEKER: Sprite = [".lll.", "lgwgl", "lgggl", ".lgl.", "..l.."];

export const CODE_BLOCK: Sprite = [
  "kkkkkkkk",
  "kSSSSSSk",
  "kSllSSSk",
  "kSSlllSk",
  "kSllSSSk",
  "kSSSSSSk",
  "kkkkkkkk",
];

export const HALLUCINATION: Sprite = [".pp.", "prrp", "prrp", ".pp."];

export const BUSH: Sprite = [
  "....gggg....",
  "..ggllllgg..",
  ".gglllllllg.",
  "gglllgllllgg",
  "glllggllglGg",
  "gGlllllllGGg",
  ".gGGlllGGGg.",
  "..gGGGGGGg..",
  "...gggggg...",
];

export const ROCK: Sprite = [
  "...ssss...",
  "..swwsss..",
  ".swsssssS.",
  "ssssssSSSS",
  "sSssSSSSSS",
  ".SSSSSSSd.",
  "..dddddd..",
];

export const SERVER: Sprite = [
  "kkkkkkkkkk",
  "kSSSSSSSSk",
  "kSdddddlSk",
  "kSSSSSSSSk",
  "kSddddlcSk",
  "kSSSSSSSSk",
  "kSdddddlSk",
  "kSSSSSSSSk",
  "kSddddclSk",
  "kSSSSSSSSk",
  "kSdddddlSk",
  "kSSSSSSSSk",
  "kddddddddk",
  "kkkkkkkkkk",
];

export const CRATE: Sprite = [
  "kkkkkkkkkk",
  "kSSSSSSSsk",
  "kodddddddk",
  "kkkkkkkkkk",
  "kSSSSSSSsk",
  "kodddddddk",
  "kkkkkkkkkk",
  "kSSSSSSSsk",
  "kodddddddk",
  "kkkkkkkkkk",
];

export const FLOWER: Sprite = [".r.r.", "rryrr", ".rrr.", "..g..", ".gg.."];

export const TUFT: Sprite = ["l.l.l.", ".lglg.", "gGgGgg"];

export const CABLE: Sprite = ["..dddd..", ".dSSSSd.", "dS.dd.Sd", "dS.dd.Sd", ".dSSSSd.", "..dddd.."];

export const PROPS: readonly Sprite[] = [BUSH, ROCK, SERVER, CRATE, FLOWER, TUFT, TUFT, FLOWER, CABLE];

export function outlined(sprite: Sprite, key: string): Sprite {
  const width = (sprite[0]?.length ?? 0) + 2;
  const filled = (x: number, y: number) => {
    const cell = sprite[y - 1]?.[x - 1];
    return cell !== undefined && cell !== ".";
  };
  return Array.from({ length: sprite.length + 2 }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      if (filled(x, y)) {
        return sprite[y - 1]?.[x - 1] ?? ".";
      }
      const touching = filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1);
      return touching ? key : ".";
    }).join(""),
  );
}

export const BOSS_OUTLINED: Sprite = outlined(BOSS, "w");

export function eliteSprite(sprite: Sprite): Sprite {
  return outlined(outlined(sprite, "w"), "r");
}
