# Data

Everything about the game data that powers Dragoarbre: where it lives, what
each field means, where it came from, and how to fix it.

## Where it lives

| File | Contents |
|---|---|
| `src/data/types.ts` | The shared type model: `MountColor`, `Recipe`, `Bonus`, `SpecialMount`, `StatId`, `SpeciesId`. |
| `src/data/colors.ts` | The 66 Dragoturkey colors, generations 1-10. Fully enumerated (see below). |
| `src/data/seemyools.ts` | The 15 Seemyool monocolors; the other 105 colors are derived. |
| `src/data/rhineetles.ts` | The 15 Rhineetle monocolors; the other 105 colors are derived. |
| `src/data/speciesInfo.ts` | Per-species metadata: the species word, the common bonus every mount of it carries, and where generation 1 is captured. |
| `src/data/species.ts` | Not data — the `buildSpecies()` builder that derives a species' bicolors from its monocolors, plus the `colorId()` id rule. |
| `src/data/specials.ts` | The 2 special Dragoturkeys (bought, not bred). |
| `src/data/index.ts` | Public data API: re-exports the three datasets and derives the reverse "children of" index and lineage lookups across all of them. Nothing here is hand-maintained data. |

Every raw data file starts with a header comment naming its source brief and
the date it was last verified against that source.

## Field reference

`MountColor` (see `src/data/types.ts` for the authoritative shape):

- `id` — stable kebab-case English id, e.g. `'almond-ginger'`. Never reused, never renamed once shipped (it's the routing/URL-safe key for phase 2+).
- `species` — `'dragoturkey'`, `'seemyool'` or `'rhineetle'`. Dragoturkey ids are bare (`almond`); the two later species prefix theirs (`seemyool-almond`), because all three have an "Amande" and shipped ids are frozen. See `docs/DECISIONS.md`.
- `generation` — 1 through 10.
- `kind` — `'mono'` for odd generations (1,3,5,7,9), `'bicolor'` for even ones. Always derivable from `generation % 2`, but stored explicitly so consumers don't have to know that rule.
- `name` — `{ fr, en }`, the **bare** color name without the species word (e.g. `"Amande et Rousse"` / `"Almond and Ginger"`, not "Dragodinde Amande et Rousse"). UI composes the full display name via `src/utils/names.ts#composeFullName`, which also handles the FR/EN word-order difference (species word first in FR, last in EN).
- `bonuses` — the color's stat bonuses at level 200, **excluding** the species common bonus (400 Vitality / 1 MP / 1 AP). That lives once in `speciesInfo.ts` and is displayed separately, so it is never summed into a color's own list.
- `crosses` — every recipe producing this color, each a `[parentAId, parentBId]` pair. Present on every color except generation 1. Dragoturkeys always have exactly one; a Seemyool or Rhineetle monocolor can have up to 12. Consumers must handle any length.
- `wildCapture` — `true` only on generation 1 colors, which have no `crosses`.

`SpecialMount` is deliberately a separate type from `MountColor` — its bonuses
(elemental resistance, reflected damage) fall outside the `StatId` vocabulary
used for breeding-tree stat filtering, and specials aren't part of the tree at all.

## Derived data — never hand-edit

`src/data/index.ts` computes, once at module load, purely from the three datasets:

- `getChildrenIds(id)` — the reverse of `crosses`: which colors a given color helped produce. Deduped, so a parent used by two recipes of the same child is listed once.
- `getAncestorIds(id)` / `getLineageIds(id)` — recursive walk back to generation-1 roots, following **every** recipe. For a 12-recipe Rhineetle that is the union of all its ancestry paths (28 colours for Plum), which is what you want when asking "what could this ever be made from".
- Lineage *highlighting* in the tree uses `cheapestLineageIds()` from `src/core/planner.ts` instead — the same walk restricted to each colour's chosen recipe (11 colours for Plum). It lives in `core/` rather than here because it depends on the planner's cost ranking, which `src/data/` must not know about.

If you ever see one of these values look wrong, the bug is in the source
data's `crosses` field, not in the derivation logic — fix the data, not the index.

## Sourcing rule

**Game data comes only from a user-provided brief or an explicit follow-up
correction from Rudy. It is never invented, guessed, or scraped.** This
applies to color names, bonus values, recipes, wild-capture details,
and special-mount acquisition info alike. If a value is genuinely unknown,
it is left out or flagged — never filled in with a plausible-looking guess.

Sources are `BRIEF-phase-1.md` for Dragoturkeys and `BRIEF-phase-3.md` for
Seemyools and Rhineetles (both at the repo root), community-documented data
as of the Dofus 3.5 breeding rework. See the header comment in each data file
for the exact "last verified" date.

Where a source is internally inconsistent, it is transcribed **as given** and
flagged in a code comment for someone to re-verify in game. We do not repair
data by guesswork, even when the guess looks obvious.

Two known instances, both in the Seemyool generation-9 recipes, both of the
same shape — a second parent repeated where the sibling colors cycle through
five distinct ones:

| Color | Source says | Symmetry suggests |
|---|---|---|
| Azur | "Prune et Ivoire" in recipes 3 **and** 5 | "Prune et Émeraude" in recipe 5 |
| Aigue-marine | "Turquoise et Émeraude" in recipes 4 **and** 5 | "Prune et Émeraude" in recipe 5 |

`BRIEF-phase-3.md` names only the Azur case; the Aigue-marine one was found
while transcribing, by comparing against Ambre, whose five second parents run
Roux → Amande → Ivoire → Turquoise → Prune with no repeat. Both are
transcribed faithfully, flagged in `seemyools.ts`, and pinned by tests so
neither can be silently "corrected" later. Both are worth checking in game.

## How to correct a wrong value

1. Get the correction from an authoritative or user-provided source (in-game screenshot, official patch notes, or a message from Rudy).
2. Edit the value directly in `colors.ts` / `seemyools.ts` / `rhineetles.ts` / `speciesInfo.ts` / `specials.ts`. For a bicolor of the two new species there is nothing to edit — its values are derived from its two monocolors, so correct the monocolor's `component` instead.
3. Bump that file's header "last verified" date.
4. Run `bun test` — the integrity tests will catch structural breakage (wrong counts, dangling recipe references, etc.), but they cannot catch a wrong-but-well-formed value. Sanity-check the number against the source yourself.
5. Note the correction in `docs/DECISIONS.md` if it reflects a judgment call (e.g. an ambiguous translation), or just a normal commit message if it's a plain typo fix.

## How the three species are declared

Dragoturkeys and the two later species are declared differently, on purpose.

**Dragoturkeys** are fully enumerated in `colors.ts` — all 66 entries, each
with its own transcribed bonus values. Phase 1 is their source of truth and
those values carry known irregularities, so they are never regenerated.

**Seemyools and Rhineetles** declare only their 15 monocolors each;
`buildSpecies()` derives the other 105 colors from the universal structure
rules verified in `BRIEF-phase-3.md` section 3:

- the bicolor set is exactly every unordered pair of two distinct monocolors
- `generation({A,B})` = `max(generation(A), generation(B)) + 1`
- `crosses({A,B})` = one recipe, the two monocolors
- `bonuses({A,B})` = `component(A) + component(B)`, summed per stat

A monocolor is declared with its `name`, its own `bonuses`, the `component`
it contributes to every bicolor containing it, and its `recipes`. Recipes are
written the way the brief writes them: each parent is either a monocolor id
(`'golden'`) or a bicolor named by its two monocolors in either order
(`['golden', 'crimson']` for "Doré et Pourpre"). A reference that resolves to
nothing throws at module load rather than leaving a dangling id.

Composed bicolor **names** are the one derived value that is a judgment call
rather than a fact — see `docs/DECISIONS.md`. They are alphabetical per
language and flagged for in-game verification.

## Checklist for adding a further species

1. Add `src/data/<species>.ts` exporting a `MonoSpec[]` table and calling `buildSpecies()`, with the header-comment sourcing convention.
2. Add its `SpeciesInfo` to `src/data/speciesInfo.ts`: species word, common bonus (and the level it starts at, only if the source states one), and wild-capture text.
3. Add the id to `SpeciesId` in `types.ts` and to the registries in `index.ts`.
4. Add any missing `StatId` values **and** their FR/EN keys under `stats.*` in both locale files — the two must stay in sync.
5. Add integrity tests in the shape of `seemyools.test.ts`: exact per-generation counts, exact recipe counts per odd-generation monocolor, recipe validity, id uniqueness, and conformance to the section 3 structure rules.
6. Verify the tree renders before enabling the species tab.
7. Update this file if the new species needs a model change — as Seemyools and Rhineetles did when they turned `cross` into `crosses`.
