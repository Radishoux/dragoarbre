# Orchestration Protocol - Parallel Agents with Visible Tracking

This file defines HOW to work on this project. It applies to every phase brief (BRIEF-phase-*.md). Read the phase brief for WHAT to build, then follow this protocol to build it fast with parallel agents while keeping the human able to follow everyone's progress at all times.

## Ground rules

- Maximum 4 agents working simultaneously, plus you as the lead/orchestrator.
- The human wants speed AND visibility. Never trade one for the other.
- Parallelize only genuinely independent work. Dependencies are handled by sequencing, not by hope.
- Every task has exactly one owner and an explicit list of files/directories it owns. Two agents never write to the same file in the same wave.
- Shared root files (package.json, bun.lock, vite config, tsconfig, biome config, CI workflow, CLAUDE.md, TASKS.md) are owned by the lead only. Agents needing a dependency added report it to the lead instead of touching package.json.
- The same ownership discipline applies to cross-cutting registries inside files: i18n keys, route definitions, shared exported types. Each agent works in its own namespace (for example i18n keys prefixed by feature), never renames or repurposes a key it does not own, and the integration wave includes an explicit check for duplicate, orphaned or repurposed keys. Two individually correct changes can still break the seam between them; the seam is the lead's responsibility.

## Mode A (preferred): native agent team

If agent teams are available in this environment (the experimental feature is enabled), run the phase as an agent team:

1. You are the team lead. Decompose the phase brief into a shared task list with clear dependencies before spawning anyone.
2. Spawn up to 4 teammates with focused roles. For a typical phase: one for the data layer and its tests, one for the main UI feature, one for i18n and secondary pages, one for tooling/CI/docs. Adapt roles to the phase content.
3. Each task description must contain: goal, owned files/directories, definition of done, and what NOT to touch. Teammates do not inherit your conversation, so put full context in the task itself and rely on CLAUDE.md for project conventions.
4. Teammates are not isolated in worktrees, so the file-ownership partitioning above is mandatory, not optional.
5. Keep the shared task list accurate at all times: it is the human's live progress view. Statuses are known to occasionally lag, so verify actual completion (files exist, tests pass) before treating a task as done, and fix stale statuses.
6. Review every teammate's output yourself: run tests, lint and a build on the integrated result before marking integration tasks complete.

If you attempt a team and end up spawning plain subagents instead, say so, then fall back to Mode B cleanly rather than pretending a team exists.

## Mode B (fallback): parallel subagents in waves

If agent teams are not enabled, use parallel subagents from this session, max 4 concurrent:

1. Wave 0, lead solo: project scaffold, configs, CLAUDE.md, TASKS.md, empty module boundaries. Commit.
2. Wave 1, fan out up to 4 subagents on independent tracks with the same task-description rules as Mode A (goal, owned files, definition of done, full context in the prompt).
3. Wave 2, integration: lead merges results, resolves interface mismatches, runs tests/lint/build, fixes or dispatches fix-up subagents.
4. Repeat waves as needed. Prefer named background subagents for long tracks so their status is visible in the session, and keep your own todo list in sync so the terminal shows progress.

## TASKS.md: the human-readable board (both modes, mandatory)

Maintain a `TASKS.md` at the repository root. This is the persistent progress board the human can open at any moment, on top of whatever the terminal shows. Rules:

- One table: `ID | Task | Owner | Status | Depends on | Notes`.
- Statuses: `todo`, `in progress`, `review`, `done`, `blocked`.
- Update it at every status change, immediately, not in batches at the end.
- Add a one-line "Last update" timestamp at the top and a short "Current wave" summary sentence.
- Commit TASKS.md together with the work it describes, so git history doubles as a progress log.
- Keep it honest. If something is blocked or failed, it says so with the reason.

Example shape:

```
# Task Board - Phase 1
Last update: 2026-08-18 14:32
Current wave: Wave 1, 4 agents building in parallel.

| ID | Task | Owner | Status | Depends on | Notes |
|----|------|-------|--------|------------|-------|
| T1 | Scaffold Vite + Bun + Biome + CI | lead | done | - | |
| T2 | Data layer + integrity tests | agent-data | in progress | T1 | 66 colors seeded, tests WIP |
| T3 | Breeding tree view | agent-ui | in progress | T1 | pan/zoom done, lineage highlight next |
| T4 | i18n FR/EN + pages | agent-i18n | in progress | T1 | |
| T5 | Deploy workflow + README | agent-devops | review | T1 | awaiting lead check |
| T6 | Integration + full test pass | lead | todo | T2,T3,T4,T5 | |
```

## Reporting protocol for agents

Every teammate or subagent ends its work with a structured report: what was done, files created/modified, commands run and their results (tests, lint), and any open issue or decision needing the lead. The lead translates these reports into task list and TASKS.md updates. No self-declared "done" without evidence.

## Quality gates before closing a wave

- `bun test` and lint pass on the integrated codebase, not just per-agent.
- The app builds and runs (`bun run build`, quick smoke of `bun run dev` output).
- TASKS.md reflects reality.
- Work is committed in coherent conventional commits (agents may work uncommitted; the lead commits per integrated track, or per teammate branch if using one).

## Communication with the human

- At the start: post the decomposition plan (the initial TASKS.md content) before fanning out, so the human can veto or adjust in a few seconds. Do not wait for approval more than that single checkpoint; the human values autonomy and speed.
- During: the human follows progress via the task list in the terminal and TASKS.md. Do not spam chat with routine per-agent narration.
- At the end of the phase: a concise summary of what shipped, what was cut or deferred, and anything needing the human (for example enabling GitHub Pages in repo settings).
