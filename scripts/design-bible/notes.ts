import type { RegularKind, WeaponId, WorldId } from "../../src/sim/arena/content";
import type { Tier } from "../../src/sim/tiers";

export interface CritterNote {
  readonly name: string;
  readonly trait: string;
  readonly props: string;
  readonly motion: string;
  readonly questions: readonly string[];
}

export interface WorldNote {
  readonly name: string;
  readonly rival: string;
  readonly theme: string;
  readonly boss: string;
  readonly bossConcept: string;
  readonly bossSilhouette: string;
  readonly bossQuestions: readonly string[];
  readonly critters: Readonly<Partial<Record<RegularKind, CritterNote>>>;
  readonly questions: readonly string[];
}

export const WORLD_NOTES: Readonly<Record<WorldId, WorldNote>> = {
  hustlr: {
    name: "Prompt Plains",
    rival: "Hustlr",
    theme: "Growth hacking, cold outreach and engagement farming. Bright grass, loud critters that want your attention.",
    boss: "The Growth Hacker",
    bossConcept: "Blond quiff, shades pushed up, vest over a tee. Holds a rocket up in front of a rising chart; the chart turns red when he is angry.",
    bossSilhouette: "Raised rocket arm plus the chart line on the other side make a lopsided V. That asymmetry is the read; keep it in every pose.",
    bossQuestions: [
      "The windup only changes the face and the chart color. Should he wind up the rocket arm (pull it back) so the attack reads from across the screen?",
      "His spread attack has no pose of its own. A 'launch' impact pose with the rocket thrown forward would tie the shots to him.",
    ],
    critters: {
      grunt: { name: "Spam Roach", trait: "Eager, never stops coming", props: "Envelope shell whose flap lifts", motion: "Fast skitter, twitching antennae", questions: ["Grey envelope body sits close to the grass in value. Warmer paper or a red stamp would lift it."] },
      runner: { name: "Clickbait Moth", trait: "Shocked, always alarmed", props: "Cursor-arrow wing markings, flashing alert", motion: "Flapping, erratic", questions: ["Reads as a purple blob at 1x. The cursor marking is the gag; make it bigger or brighter."] },
      shooter: { name: "Cold Email Crow", trait: "Smug comb-over salesman", props: "Tie, letter in its beak", motion: "Head bob before it spits a letter", questions: ["Its shot is the generic red orb. A folded letter projectile would sell the joke."] },
      splitter: { name: "Engagement Locust", trait: "Fake smile farmer", props: "Straw hat, pitchfork", motion: "Hop crouch, swaying pitchfork", questions: [] },
      heavy: { name: "Thought Leader Toad", trait: "Smug keynote speaker", props: "Glasses, headset mic, red stage dot", motion: "Throat puff, wagging finger", questions: ["Strongest character in the set. Use it as the bar for the others."] },
      lootRunner: { name: "Free Lead Mouse", trait: "Worried, sweating", props: "Business card it runs off with", motion: "Panicked sprint", questions: [] },
    },
    questions: ["Fodder (roach, moth) is much smaller and flatter than the heavy toad. Good tier contrast, but the two fodder read as dots in a swarm."],
  },
  notionally: {
    name: "Memory Lane",
    rival: "Notionally",
    theme: "Notes apps and wikis that hold your memory hostage. Dusty paper, sticky notes, padlocks.",
    boss: "The Archivist",
    bossConcept: "Grey bun, half-moon glasses on a chain, cardigan. Clutches a padlocked ledger; her key ring swings.",
    bossSilhouette: "A compact block with the ledger across the chest. The most rectangular boss, so it risks reading as a box.",
    bossQuestions: [
      "Her silhouette is a rectangle. Could the ledger open or the keys swing wide on windup to break the outline?",
      "The trail attack leaves pages on the ground. Should the pages come out of her ledger visually?",
    ],
    critters: {
      grunt: { name: "Sticky-Note Snail", trait: "Slow, clingy", props: "Sticky note shell", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      splitter: { name: "Duplicate Page Rabbit", trait: "Copies itself", props: "Page ears", motion: "Four hand-posed walk frames; no idle tic yet", questions: ["Pale body on pale grass. Check it in the dust hazard too."] },
      runner: { name: "Context Leech", trait: "Drains your context", props: "Pink tube body", motion: "Four hand-posed walk frames; no idle tic yet", questions: ["Smallest sprite in the game. In a swarm of 300 it may vanish; consider a brighter tip or a trail."] },
      brute: { name: "Wiki Tortoise", trait: "Stubborn, slow", props: "Bookshelf shell", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      heavy: { name: "Locked Archive Pangolin", trait: "Locks everything", props: "Padlock on its back", motion: "Four hand-posed walk frames; no idle tic yet", questions: ["Teal body is a near match for the old faction tint; check against the world 3 ground if it ever crosses worlds."] },
      lootRunner: { name: "Export Squirrel", trait: "Hoarder, flees with your data", props: "Export acorn", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
    },
    questions: ["This set has the weakest ground contrast overall. Every critter sits within one value step of the olive grass."],
  },
  meterly: {
    name: "Metered Mines",
    rival: "Meterly",
    theme: "Usage billing, rate limits and tolls. Teal mine floor, coins, meters and receipts.",
    boss: "The Throttler",
    bossConcept: "Cap, hi-vis vest, coin belt. Raises a stop paddle while his handheld meter prints a growing ticket.",
    bossSilhouette: "Stop paddle above the head on one side, printing meter low on the other. Clear diagonal read.",
    bossQuestions: [
      "He charges in a straight lane. A lean-forward windup with the paddle pointed down the lane would tell the player where.",
      "The ticket growing is a great idle tic. Could it also be the phase meter, longer each phase?",
    ],
    critters: {
      grunt: { name: "Invoice Tick", trait: "Bills you per bite", props: "Invoice on its back", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      charger: { name: "Rate Limiter Beetle", trait: "Revs before it charges", props: "Speedometer shell", motion: "Four hand-posed walk frames; no idle tic yet", questions: ["Its windup is the main tell for the charge. The needle should swing to red during the tell."] },
      exploder: { name: "Timeout Beetle", trait: "Ticking clock", props: "Hourglass body", motion: "Four hand-posed walk frames; no idle tic yet", questions: ["The fuse is 0.8 s. The hourglass could visibly empty across those frames."] },
      brute: { name: "Quota Crab", trait: "Cuts you off", props: "Scissor claws", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      heavy: { name: "Toll Raccoon", trait: "Toll booth bandit", props: "Cap and coin jar", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      lootRunner: { name: "Refund Gecko", trait: "Escapes with your refund", props: "Coin tail", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
    },
    questions: ["Two beetles in one world. They differ by prop (speedometer vs hourglass), but their silhouettes are close at 1x."],
  },
  synergex: {
    name: "Automation Factory",
    rival: "Synergex",
    theme: "Enterprise process, planners and blockers. Purple factory floor, conveyor gates, sign-off sheets.",
    boss: "The Process Owner",
    bossConcept: "Hard hat, glasses, tie and lanyard. The boxes on his clipboard tick themselves off.",
    bossSilhouette: "Hard hat dome plus clipboard to the side. Very similar stance to The Throttler; both are front-on with one prop arm.",
    bossQuestions: [
      "He and The Throttler share a body and a hat-and-vest read. Give him a different build (tall and thin, or seated on a forklift) so the two don't blur.",
      "His burst attack could come from the clipboard: each ticked box fires a shot.",
    ],
    critters: {
      grunt: { name: "Step Ant", trait: "Follows the process", props: "Step card", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      runner: { name: "Synergy Bee", trait: "Buzzword busybody", props: "Lanyard", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      splitter: { name: "Branch Stick Insect", trait: "Forks into copies", props: "Branching twig body", motion: "Four hand-posed walk frames; no idle tic yet", questions: ["Thin dark green lines on purple: lowest mass in the world. Hard to hit, hard to see."] },
      brute: { name: "Blocker Hippo", trait: "Blocks everything", props: "Stop sign", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      heavy: { name: "Legacy Sloth", trait: "Never changes", props: "Tie and moss", motion: "Four hand-posed walk frames; no idle tic yet", questions: ["Grey body reads as a person in a suit at a glance. Good joke, but it now competes with the people bosses."] },
      lootRunner: { name: "Shortcut Ferret", trait: "Sneaks past process", props: "Shortcut key", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
    },
    questions: [],
  },
  trustMe: {
    name: "TrustMe Depths",
    rival: "TrustMe.ai",
    theme: "Confident answers with no sources. Deep water, glowing lures, scrolls and citations.",
    boss: "The Confident Expert",
    bossConcept: "Headset mic, blazer over a turtleneck. Both arms up under a glowing star that turns red when he is angry.",
    bossSilhouette: "Arms-up Y shape with the star above. The strongest boss silhouette.",
    bossQuestions: [
      "His fakes attack spawns decoys. The decoys could be his own silhouette in a flat color, so the 'which one is real' read comes from his shape.",
    ],
    critters: {
      grunt: { name: "Hallucination Jelly", trait: "Makes things up", props: "Glowing bell", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      splitter: { name: "Chunk Starfish", trait: "Splits into chunks", props: "Star segments", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      shooter: { name: "Confident Parrot", trait: "Repeats what it heard", props: "Mortarboard", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      brute: { name: "Deep Index Angler", trait: "Lures you with a fake answer", props: "Glowing lure", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      heavy: { name: "Citation Octopus", trait: "Buries you in citations", props: "Scrolls in its arms", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
      lootRunner: { name: "Real Source Seahorse", trait: "The one honest source", props: "Source tag", motion: "Four hand-posed walk frames; no idle tic yet", questions: [] },
    },
    questions: ["Water creatures on a sand-brown ground. The world reads as a beach, not depths. Should the ground go darker and bluer, with the critters glowing?"],
  },
};

export interface WeaponNote {
  readonly concept: string;
  readonly guide: string;
  readonly read: string;
  readonly questions: readonly string[];
}

export const WEAPON_NOTES: Readonly<Record<WeaponId, WeaponNote>> = {
  prompt: { concept: "Your first tool: a speech bubble fired at the nearest rival.", guide: "Starter straight shot", read: "A small chat bubble with a prompt glyph. Stages add an outline color.", questions: ["Stages only change the outline. Should the bubble get longer (more text) per stage?"] },
  webSearch: { concept: "Searches that home in on rivals.", guide: "Kunai (homing)", read: "Short cyan beam darts, rotated to their heading.", questions: ["Reads as a laser, not a search. A magnifier head on the dart would name it."] },
  codeExec: { concept: "Lobbed code that bursts into a burning zone.", guide: "Molotov", read: "A code block arcs up, lands and leaves a fire disc that burns for 3 s.", questions: ["In flight it is a grey box. Spin it, or give it a lit fuse, so it reads as thrown.", "The burning zone is drawn by the renderer as a flat disc. It needs its own flame tiles in the code palette."] },
  browser: { concept: "Cursors orbit you, click rivals and block shots.", guide: "Guardian (orbit)", read: "Mouse cursors circle the agent at a fixed radius.", questions: ["Clicks have no effect frame. A small click ripple on hit would sell 'click'."] },
  shell: { concept: "Throws a heavy brick that smashes through rivals.", guide: "Brick", read: "A terminal-window brick flies out and knocks rivals back hard.", questions: ["The brick looks like the code exec block at a glance. Shell needs its own shape (a thick prompt slab, or the >_ glyph larger)."] },
  voice: { concept: "A sound wave around you hits every rival in range.", guide: "Forcefield", read: "No sprite. The renderer draws a ring pulse.", questions: ["Voice is the only weapon with no art. Draw a pulse ring sprite set (waveform ring) pre-drawn at each radius, plus a HUD icon on the agent."] },
  subagents: { concept: "Little helper agents fly with you and fire homing shots.", guide: "Drones", read: "Mini agents bob around you on a circle.", questions: ["Drones fire no visible shot of their own in the storyboard. Give them a muzzle blink when they shoot."] },
  ragSearch: { concept: "Evolved web search: a swarm of grounded searches.", guide: "Evolved Kunai", read: "Longer yellow-green darts.", questions: ["Only a recolor of the base dart. Evolutions should change shape, not just color."] },
  codeInterpreter: { concept: "Evolved code exec: sandboxed bombs with big fire zones.", guide: "Evolved Molotov", read: "A terminal window projectile.", questions: [] },
  computerUse: { concept: "Evolved browser: six fast cursors.", guide: "Evolved Guardian", read: "Cursor with a double cyan outline.", questions: ["Recolor of the base cursor. A hand cursor or a cursor with a trail would make the evolution feel earned."] },
  ciPipeline: { concept: "Evolved shell: a barrage of huge bricks.", guide: "Evolved Brick", read: "Brick with gold and orange outlines.", questions: ["Recolor again. A pipeline of bricks chained together would read as CI."] },
};

export interface TierNote {
  readonly concept: string;
  readonly questions: readonly string[];
}

export const TIER_NOTES: Readonly<Record<Tier, TierNote>> = {
  1: { concept: "A raw model: a round blue orb with a fuse antenna. No arms, no legs, no tools.", questions: ["At 16 px it is smaller than most fodder. Should the player always be the clearest thing on screen (outline or ground ring)?"] },
  2: { concept: "A chat window on wheels. It can talk now.", questions: [] },
  3: { concept: "Arms and a wrench: it can use tools.", questions: [] },
  4: { concept: "A backpack and an antenna: it plans and remembers.", questions: [] },
  5: { concept: "The harnessed agent: rotor, jet pack, guard plating. Fully owned.", questions: ["Biggest change happens at tier 5. Each tier should add one readable part so players see the growth even mid-fight."] },
};

export const GUIDE_NOTE = {
  concept: "Chowderr, the guide who helps you build your own agent. Brown skin, short dark hair, gold headphones with a mic, dark hoodie, brand gold.",
  questions: [
    "The look was chosen without a reference. Send a photo or description for a likeness.",
    "The guide only exists as a 40 px bust. A full-body sprite would let Chowderr appear in the arena (tutorial, results screen).",
  ],
};
