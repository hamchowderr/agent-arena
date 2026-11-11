# Agent Arena — Agent Context

A free, open-source (AGPL-3.0-or-later) browser autobattler. Players grow an agent from a raw LLM into a harnessed agent, then fight rival agents from fictional parody SaaS companies. Built with Claude Code. The game links out to Mastra ("Build your own agent with Mastra"); the game itself does not run on Mastra.

## Where it's played
Every merge to `main` deploys the build to GitHub Pages at https://arena.chowderr.dev/ (`.github/workflows/deploy.yml`). The domain lives only in `src/site/site-url.ts`: the build writes it into the page head (`%SITE_URL%` in `index.html`) and into `dist/CNAME`, and `src/site/site-url.test.ts` fails if `index.html` hard-codes an address. Vite uses `base: "./"` so the build also works from a subpath or a local preview, and `scripts/check-size.mjs` fails if `dist/index.html` links from the site root.

## Commands
- `npm run dev`: local dev server
- `npm run balance`: the balance bots play 1000 seeded runs of the old turn-based stage loop and print clear rates per stage. The targets in `src/sim/run.ts` (`BALANCE_TARGETS`) are tested in CI.
- `npm run arena-balance`: the kiting bot plays seeded real-time arena runs (`src/sim/arena/`) and prints survival time, level, kills and bosses per run. Set `RUNS` to change the count.
- `npm run opening-pace`: the kiting bot plays seeded runs and prints enemies alive and level at checkpoints over the first two minutes, plus when the first five level-ups land. Use it when tuning how calm the opening feels.
- `npm run art-sheet`: renders every enemy on every world's ground to `art-sheet/enemies.png`. CI uploads it as the `art-sheet` artifact on every PR.
- `npm run check`: lint, typecheck, tests, build, and size budget. It must pass before every push.

## Rules that are enforced
- **Deterministic sim.** Code in `src/sim/` takes a seed and inputs, and returns the same result every time. Lint bans `Math.random`, `Date`, `performance`, timers and the DOM there. Use `createRng(seed)` and integer math. Every sim change keeps the "same seed, same result" test green.
- **No comments.** The `local/no-comments` lint rule bans them. If something needs explaining, rename it or write a test.
- **Size budget.** The initial download (the entry chunk and everything it imports statically) stays under 124 KB gzipped, and each lazy chunk stays under 200 KB (`scripts/check-size.mjs`). The game, with three.js and pixelfx, loads as a lazy chunk after the page shell. Strudel loads as its own lazy chunk whose file name starts with `strudel` and has no budget.
- **Run loop statechart.** `RUN_LOOP` in `src/sim/arena/run-loop.ts` is the only way the run's status changes, and the sim throws on any move it doesn't list. `run-loop.test.ts` model-checks every reachable state (no dead ends, every run can end, no boss skipped) and replays bot runs against it. If you change the table, regenerate the diagram in `docs/run-loop.md`; a test fails if they disagree.
- **Replays.** Every change to a run goes through `act()` in `src/sim/arena/replay.ts`, which applies the action and records it. Lint bans importing `step`, `choose`, `reroll` or `skip` into `src/game/`, `src/render/` or `src/main.ts`. A replay link is `?seed=N#replay=CODE` (deflate-raw + base64url of the action log, see `src/game/replay-link.ts`). Links carry a check of the final state, so a sim change makes old links play out differently and show a warning instead of lying; bump `REPLAY_VERSION` when the byte format changes.
- **Languages.** All player-facing text lives in `src/i18n/locales/en.ts` and is shown with `t("key")`. The other seven locales (es, pt, fr, de, ja, ko, zh-Hans) must fill every key: typecheck fails on a missing or extra key, and `src/i18n/i18n.test.ts` fails on empty strings or mismatched `{placeholders}`. The `local/no-raw-ui-text` lint rule bans raw strings passed to `text()`, `wrap()`, `drawButton()` and banner or dialogue fields in `src/game/`. The sim emits ids and numbers only, never text. Each locale except English is a lazy chunk.
- **Vendored code.** `vendor/pixelfx` is a copy of pixelfx (MIT). Don't edit it; re-copy from upstream at the commit in `vendor/pixelfx/VERSION`. Lint skips `vendor/`.

## How to fix things (in order of value)
When a bug or a correction comes up, remove the cause as high on this list as you can:
1. Make it impossible through architecture, types or data structures.
2. Add a lint rule or a test so CI catches it.
3. Add a skill or a rule in this file.
4. Rely on human review, as a last resort.

Every bug fix ships with the check that would have caught it.

## Evidence over claims
PRs show proof: a failing test that now passes, a replay seed, or a screenshot. Prefer tests and deterministic checks over AI review passes.

## Tracking work
- **beads (`bd`)** is the issue tracker and tracks agent work across Claude Code sessions. Check `bd ready` at the start of a session and claim an issue before starting. File new issues instead of leaving TODOs.
- **Beads sync** lives on DoltHub at `chowderr/agent_arena`. `scripts/beads-sync.sh` runs at session start: it installs the DoltHub key from `DOLT_CREDS_JWK` and `DOLT_CREDS_KEY_ID` when they are set, then bootstraps or pulls. Run `bd dolt push` after changing issues. Without the key everything still works locally from `.beads/issues.jsonl`.
- **pstack** (open-pstack for Claude Code) provides the engineering-rigor skills.

## Art rules
- **Read `.claude/skills/pixel-art/SKILL.md` before drawing anything.** `src/art/audit.test.ts` enforces the limits in `src/art/art-rules.ts`: size by tier, colors per sprite, ground contrast, hue spread within a world, unique silhouettes, native scale and tells of at least 0.8 s. Sprites that still break a rule are listed in `REDRAW_PENDING`, and that list may only shrink.

## Content rules
- **Story: own your agent.** The player builds and owns their agent. Every rival company wants you to rent theirs, an agent you don't own or control. Rival names and plot get filled in over time, so use placeholders until then.
- All companies, mascots and characters are fictional parodies. No real brands, products or people as targets.
- Music is written in Strudel and played live in the browser (`@strudel/web`, AGPL). That's why this repo is AGPL.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:1105d646 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
