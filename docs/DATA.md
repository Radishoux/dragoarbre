# Data

Everything about the game data that powers Dragoarbre: where it lives, what
each field means, where it came from, and how to fix it.

## Where it lives

| File | Contents |
|---|---|
| `src/data/types.ts` | The shared type model: `MountColor`, `Bonus`, `SpecialMount`, `StatId`, `SpeciesId`. |
| `src/data/colors.ts` | The 66 Dragoturkey colors, generations 1-10. |
| `src/data/specials.ts` | The 2 special Dragoturkeys (bought, not bred). |
| `src/data/wildCapture.ts` | Bilingual wild-capture info shown for generation-1 colors. |
| `src/data/index.ts` | Public data API: re-exports the raw datasets and derives the reverse "children of" index and lineage lookups. Nothing here is hand-maintained data — it's all computed from `colors.ts`. |

Every raw data file starts with a header comment naming its source brief and
the date it was last verified against that source.

## Field reference

`MountColor` (see `src/data/types.ts` for the authoritative shape):

- `id` — stable kebab-case English id, e.g. `'almond-ginger'`. Never reused, never renamed once shipped (it's the routing/URL-safe key for phase 2+).
- `species` — always `'dragoturkey'` in phase 1.
- `generation` — 1 through 10.
- `kind` — `'mono'` for odd generations (1,3,5,7,9), `'bicolor'` for even ones. Always derivable from `generation % 2`, but stored explicitly so consumers don't have to know that rule.
- `name` — `{ fr, en }`, the **bare** color name without the species word (e.g. `"Amande et Rousse"` / `"Almond and Ginger"`, not "Dragodinde Amande et Rousse"). UI composes the full display name via `src/utils/names.ts#composeFullName`, which also handles the FR/EN word-order difference (species word first in FR, last in EN).
- `bonuses` — the color's stat bonuses at level 200, **excluding** the species-wide 400 Vitality every Dragoturkey grants (that's implicit, not stored per-color).
- `cross` — `[parentAId, parentBId]`. Present on every color except generation 1.
- `wildCapture` — `true` only on generation 1 colors, which have no `cross`.

`SpecialMount` is deliberately a separate type from `MountColor` — its bonuses
(elemental resistance, reflected damage) fall outside the `StatId` vocabulary
used for breeding-tree stat filtering, and specials aren't part of the tree at all.

## Derived data — never hand-edit

`src/data/index.ts` computes, once at module load, purely from `colors.ts`:

- `getChildrenIds(id)` — the reverse of `cross`: which colors a given color helped produce.
- `getAncestorIds(id)` / `getLineageIds(id)` — recursive walk back to generation-1 roots, used for the tree's lineage highlighting.

If you ever see one of these values look wrong, the bug is in `colors.ts`'s
`cross` field, not in the derivation logic — fix the source data, not the index.

## Sourcing rule

**Game data comes only from a user-provided brief or an explicit follow-up
correction from Rudy. It is never invented, guessed, or scraped.** This
applies to color names, bonus values, cross recipes, wild-capture details,
and special-mount acquisition info alike. If a value is genuinely unknown,
it is left out or flagged — never filled in with a plausible-looking guess.

The current dataset's source is `BRIEF-phase-1.md` (repo root), community-
documented data as of the Dofus 3.5 breeding rework. See the header comment
in each data file for the exact "last verified" date.

## How to correct a wrong value

1. Get the correction from an authoritative or user-provided source (in-game screenshot, official patch notes, or a message from Rudy).
2. Edit the value directly in `colors.ts` / `specials.ts` / `wildCapture.ts`.
3. Bump that file's header "last verified" date.
4. Run `bun test` — the integrity tests in `src/data/colors.test.ts` will catch structural breakage (wrong counts, dangling cross references, etc.), but they cannot catch a wrong-but-well-formed value. Sanity-check the number against the source yourself.
5. Note the correction in `docs/DECISIONS.md` if it reflects a judgment call (e.g. an ambiguous translation), or just a normal commit message if it's a plain typo fix.

## Checklist for adding a new species (phase 3)

Seemyools and Rhineetles are **not** in this dataset and must never be
stubbed with placeholder/fabricated values. When their real data is
provided:

1. Add `src/data/seemyools.ts` / `src/data/rhineetles.ts` following the same shape as `colors.ts`, with the same header-comment sourcing convention.
2. Unlike Dragoturkeys, these species can have multiple possible crosses per color — double-check whether `MountColor.cross` (a single tuple) is still sufficient or needs to become `cross: [string, string][]`. This is a deliberate open question left for phase 3, not decided here.
3. Extend `src/data/index.ts`'s derived indices to merge in the new species (they're written generically over `MountColor[]`, so this should mostly be "pass a bigger array in").
4. Add the same shape of integrity tests as `colors.test.ts` for the new dataset (count, cross validity, mono/bicolor-or-equivalent parity if it applies to that species).
5. Flip the species tab in `src/components/Header.tsx` from disabled to enabled once the tree view has been verified against the new data.
6. Update this file's field reference if the new species needs model changes.
