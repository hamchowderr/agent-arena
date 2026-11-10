import type { RegularKind } from "../sim/arena/content";
import type { Sprite } from "./sprites";

export { FACTION_KEY } from "./shade";

export const GRUNT: Sprite = [
  "..kkkkkkkkkkk...",
  ".k11111771111k..",
  ".k11111111111k..",
  ".k1kk11111kk1k..",
  ".k1wk11111wk1k..",
  ".k11111111111k..",
  ".k11111111111k..",
  ".k1111kkk1111k..",
  ".k111k111k111k..",
  ".k11111111111k..",
  ".k111111111AAk..",
  ".k11111111AAk...",
  "..kkkkkkkkkk....",
  "...kk....kk.....",
  "...k......k.....",
];

export const RUNNER: Sprite = [
  "..............kkk.",
  "....kkkkkkkkkk777k",
  "..kk2222222222k77k",
  ".k222222222222kkk.",
  ".k22wk2222wk22k...",
  "sk222222222222k...",
  ".k222222222222k...",
  "sk22w22w22w222k...",
  ".k222222222222k...",
  "..kk2222222kkk....",
  "...k22kkkkk.......",
  "...k2k............",
  "...kk.............",
];

export const BRUTE: Sprite = [
  "......kkkkkkkkkkkkkkkkkkkk......",
  ".....kAAAAAAAAAAAAAAAAAAAAk.....",
  "...kkkkkkkkkkkkkkkkkkkkkkkkkk...",
  "..k99999999999999999999999999k..",
  ".k9999999999999999999999999999k.",
  ".k9999999999999999999999999999k.",
  ".k9999999999999999999999999999k.",
  ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
  ".k00kkkkkkkkkkkkkkkkkkkkkkkk00k.",
  ".k00kDDDDDDDDDDDDDDDDDDDDDDk00k.",
  ".k00kDDmmDDDDDDDDDDDDDDmmDDk00k.",
  ".k00kDDDDDDDDDDDDDDDDDDDDDDk00k.",
  ".k00kkkkkkkkkkkkkkkkkkkkkkkk00k.",
  ".k0000000000000000000000000000k.",
  ".k0000000l0000000000000000r000k.",
  ".k0000000000000000000000000000k.",
  ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
  ".k0kAAAAAAAAAAAAAAAAAAAAAAAAk0k.",
  ".k0kAkkkkkkkkkkkkkkkkkkkkkkAk0k.",
  ".k0kAAAAAAAAAAAAAAAAAAAAAAAAk0k.",
  ".k0000000000000000000000000000k.",
  ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
  "..kkk......................kkk..",
  "..kk........................kk..",
];

export const CHARGER: Sprite = [
  "......kkkkkkkkkkkkkkk...",
  "....kk777777777777777k..",
  "...k7777777777777wk777k.",
  "..k77777777777777777777k",
  "..kkkkkkkkkkkkkkkk7kk77k",
  "..k0000000000000kAk.kkk.",
  "..kDDDDDDDDDDDDDkkk.....",
  ".k7777777777777777777k..",
  ".k7777777777777777777k..",
  "..kkkkkkkkkkkkkkkkkkk...",
  "...kk.............kk....",
  "...k...............k....",
];

export const SHOOTER: Sprite = [
  "...............kkk..",
  ".............kk33Dk.",
  "...........kk3333Dk.",
  "..kkkkkkkkk333333Dk.",
  ".k0000000k3wk3333Dk.",
  ".k0000000k3333333Dk.",
  ".k0000000k33kkk33Dk.",
  ".k0000000k3333333Dk.",
  "..kkkkkkkkk333333Dk.",
  "....k00k...kk3333Dk.",
  "....k00k.....kk33Dk.",
  "...kk00kk......kkk..",
  "...kkkkkk...........",
];

export const EXPLODER: Sprite = [
  ".......kkkk.......",
  "......kCCCCk......",
  ".....kkkkkkkk.....",
  "....k88888888k....",
  "...k8888888888k...",
  "...k88wk88wk88k...",
  "...k8888888888k...",
  "...k88888y8888k...",
  "...k8888yy8888k...",
  "...k888yyyy888k...",
  "...k88888yy888k...",
  "...k88888y8888k...",
  "...k8888888888k...",
  "...kDDDDDDDDDDk...",
  "...k8888888888k...",
  "....kkkkkkkkkk....",
  ".....kk....kk.....",
  ".....k......k.....",
];

export const SPLITTER: Sprite = [
  ".kkkkkkk...kkkkk......",
  "k4444444k.kAAAAk......",
  "k44444444kkAAAAkkkkkk.",
  "k444444444CC444444444k",
  "k444444444kC444444444k",
  "k4444wk444CC444wk4444k",
  "k444444444Ck444444444k",
  "k444444444CC444444444k",
  "k4444444kkkkkk4444444k",
  "k444444k444444k444444k",
  "k444444444CC444444444k",
  "k444444444kC444444444k",
  "kk44444444CC44444444kk",
  ".kkkkkkkkkkkkkkkkkkkk.",
  "...kk............kk...",
  "...k..............k...",
];

export const HEAVY: Sprite = [
  "..kkkkkkkkkkkkkkkkkkkkkk..",
  ".k666666666k77k666666666k.",
  ".k6kkkkkkkkkkkkkkkkkkkk6k.",
  ".k6k666666666666666666k6k.",
  ".k6k666wk666666666wk66k6k.",
  ".k6k666666kkkkkk666666k6k.",
  ".k6k66666k666666k66666k6k.",
  ".k6k6666666kAAk6666666k6k.",
  ".k6k666666kCCCCk666666k6k.",
  ".k6k666666666666666666k6k.",
  ".k6kkkkkkkkkkkkkkkkkkkk6k.",
  ".k6k666666666666666666k6k.",
  ".k6k666666666666666666k6k.",
  ".k6k6666666kAAk6666666k6k.",
  ".k6k666666kCCCCk666666k6k.",
  ".k6k666666666666666666k6k.",
  ".k6kkkkkkkkkkkkkkkkkkkk6k.",
  ".k6k666666666666666666k6k.",
  ".k6k666666666666666666k6k.",
  ".k6k6666666kAAk6666666k6k.",
  ".k6k666666kCCCCk666666k6k.",
  ".k6k666666666666666666k6k.",
  ".k6kkkkkkkkkkkkkkkkkkkk6k.",
  ".k6666666666666666666666k.",
  ".kkkkkkkkkkkkkkkkkkkkkkkk.",
  "..kk..................kk..",
  "..k....................k..",
];

export const LOOT_RUNNER: Sprite = [
  "..kkkkkkkkkkkkkkkk..",
  ".k5555555555555555k.",
  ".k5CCCC555wk55wk55k.",
  ".k5CkkC55555555555k.",
  ".k5CCCC5555kkk5555k.",
  ".k5555555555555555k.",
  ".kDDDDDDDDDDDDDDDDk.",
  ".k5555555555555555k.",
  ".k5A5A5A5A55555555k.",
  "..kkkkkkkkkkkkkkkk..",
  "....kk.......kk.....",
  "...kk.........kk....",
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

export const ENEMY_SPRITES: Readonly<Record<RegularKind, Sprite>> = {
  grunt: GRUNT,
  runner: RUNNER,
  charger: CHARGER,
  shooter: SHOOTER,
  exploder: EXPLODER,
  splitter: SPLITTER,
  brute: BRUTE,
  heavy: HEAVY,
  lootRunner: LOOT_RUNNER,
};
