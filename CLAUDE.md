# Agent Arena — Agent Context

A free, open-source (AGPL-3.0-or-later) browser autobattler. Players grow an agent from a raw LLM into a harnessed agent, then fight rival agents from fictional parody SaaS companies. Built with Claude Code. The game links out to Mastra ("Build your own agent with Mastra"); the game itself does not run on Mastra.

## Commands
- `npm run dev`: local dev server
- `npm run balance`: the balance bots play 1000 seeded runs and print clear rates per stage. The targets in `src/sim/run.ts` (`BALANCE_TARGETS`) are tested in CI, so a balance change that drifts outside them fails the check.
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
- **Beads sync** lives on DoltHub at `chowderr/agent_arena`. `scripts/beads-sync.sh` runs at session start: it installs the DoltHub key from `DOLT_CREDS_JWK` and `DOLT_CREDS_KEY_ID` when they are set, then bootstraps or pulls. Run `bd dolt push` after changing issues. Without the key everything still works locally from `.beads/issues.jsonl`.
- **pstack** (open-pstack for Claude Code) provides the engineering-rigor skills.

## Content rules
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
