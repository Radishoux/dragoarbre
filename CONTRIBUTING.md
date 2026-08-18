# Contributing

## Setup

```bash
bun install
bun run dev     # http://localhost:5173/dragoarbre/
```

## Commands

```bash
bun test          # data + breeding-math integrity tests
bun run lint        # Biome check
bun run lint:fix     # Biome check --write
bun run build         # tsc -b && vite build
bun run preview        # serve the production build locally
```

Run `bun test` and `bun run lint` before opening a PR — both run in CI
(`.github/workflows/deploy.yml`) and a failing build won't deploy.

## Code style

- TypeScript strict mode, no `any`.
- Biome enforces formatting (single quotes, no semicolons, trailing
  commas) and linting — run `bun run lint:fix` instead of hand-formatting.
- No hardcoded UI strings in components — add a key to
  `src/i18n/locales/{fr,en}/translation.json` and call `t('...')`. Game
  data (color/stat names) is bilingual at the data layer instead (`{ fr,
  en }` fields), not in the i18n files — see `docs/DATA.md`.
- TSDoc on every exported function and type; comments explain *why*, not
  *what*.
- Match the existing folder structure (`docs/ARCHITECTURE.md` has the
  full map) rather than introducing a new pattern for a one-off need.

## Commit conventions

Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`,
`refactor:`), one coherent change per commit. **Documentation is updated
in the same commit as the code it describes** — see `CLAUDE.md`'s
maintenance rules.

## Proposing a data correction

Game data is never invented or guessed — see `docs/DATA.md`'s sourcing
rule. If you spot a wrong value:

1. Open an issue (or PR directly) with the correction and where it comes
   from (in-game screenshot, patch notes, etc.).
2. If submitting a PR: edit the value in `src/data/*.ts`, bump that file's
   "last verified" header date, and make sure `bun test` still passes —
   the integrity tests catch structural breakage but not a wrong-but-
   well-formed value, so double-check the number against your source.
3. For an ambiguous case (e.g. a translation judgment call), add a short
   entry to `docs/DECISIONS.md` explaining the call.
