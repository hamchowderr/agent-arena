# Agent Arena — Agent Context

A free, open-source (AGPL-3.0-or-later) browser autobattler. Players grow an agent from a raw LLM into a harnessed agent, then fight rival agents from fictional parody SaaS companies. Built with Claude Code. The game links out to Mastra ("Build your own agent with Mastra"); the game itself does not run on Mastra.

## Commands
- `npm run dev`: local dev server
- `npm run check`: lint, typecheck, tests, build, and size budget. It must pass before every push.

## Rules that are enforced
- **Deterministic sim.** Code in `src/sim/` takes a seed and inputs, and returns the same result every time. Lint bans `Math.random`, `Date`, `performance`, timers and the DOM there. Use `createRng(seed)` and integer math. Every sim change keeps the "same seed, same result" test green.
- **No comments.** The `local/no-comments` lint rule bans them. If something needs explaining, rename it or write a test.
- **Size budget.** The initial bundle stays under 124 KB gzipped (`scripts/check-size.mjs`). Strudel loads as a lazy chunk whose file name starts with `strudel`, so it doesn't count toward the budget.

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
- **pstack** (open-pstack for Claude Code) provides the engineering-rigor skills.

## Content rules
- All companies, mascots and characters are fictional parodies. No real brands, products or people as targets.
- Music is written in Strudel and played live in the browser (`@strudel/web`, AGPL). That's why this repo is AGPL.
