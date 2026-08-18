# Project Brief - Dragoarbre (Phase 1)

You are building a fan-made web app that helps Dofus players plan mount breeding. Read this entire brief before writing any code. Everything you need for phase 1 is in this document, including the full game dataset. Do not invent or guess any game data beyond what is provided here.

## 1. What the app does

Dofus has a breeding system where players cross mounts to obtain new colors across 10 generations. Phase 1 of this app is an interactive breeding tree for Dragoturkeys (French: Dragodindes): a visual genealogy of all 66 colors, showing for each one how to obtain it, what it gives, and its full lineage back to the 3 wild base colors.

The app is bilingual (French and English) because the Dofus community is worldwide. It is a static site, no backend, deployed on GitHub Pages.

Later phases (do NOT build them now, but design for them):
- Phase 2: a "shopping list" planner. The user picks a target color and the app recursively computes how many mounts of each lower generation are needed, using expected-value math based on the probability mechanics described in section 4.
- Phase 3: add the two other mount species, Seemyools (Muldos) and Rhineetles (Volkornes). Their data is NOT in this brief. Show them as disabled "coming soon" tabs and never fabricate their data.

## 2. Tech stack (fixed, do not substitute)

- Bun as the package manager and script runner
- React with TypeScript (strict mode), bundled with Vite
- react-i18next for internationalization (French and English)
- Routing: use HashRouter from react-router so GitHub Pages needs no 404 workaround
- Styling: Tailwind CSS (or plain CSS modules if you judge Tailwind overkill, your call, but keep it consistent)
- Linting and formatting: Biome
- Tests: bun test
- Deployment: GitHub Actions workflow deploying to GitHub Pages

Project and repository name: `dragoarbre` (working title). Set Vite `base: '/dragoarbre/'`. Use "Dragoarbre" as the displayed app name in the header and in page titles, in both languages (it is a brand name, do not translate it).

Ask before adding any heavy dependency not listed here. A graph/tree rendering library is allowed if needed (see section 6), but prefer a custom SVG/CSS layout if it stays simple, since the tree structure is a clean generation-by-generation DAG.

## 3. Game data: the complete Dragoturkey table

Source: community-documented data current as of the Dofus 3.5 breeding rework (2026). Store this as typed data files (TypeScript or JSON) under `src/data/`. UI strings go in i18n locale files, but mount names, color names and stat names live in the data layer with `fr` and `en` fields.

Species names: Dragodinde (FR) = Dragoturkey (EN). Muldo (FR) = Seemyool (EN). Volkorne (FR) = Rhineetle (EN).

Color names FR to EN: Amande = Almond, Rousse = Ginger, Doree = Golden, Indigo = Indigo, Ebene = Ebony, Pourpre = Crimson, Orchidee = Orchid, Ivoire = Ivory, Turquoise = Turquoise, Emeraude = Emerald, Prune = Plum. Bicolor naming pattern: FR "Dragodinde Amande et Rousse", EN "Almond and Ginger Dragoturkey". Keep the exact FR orderings given below (the game is inconsistent, e.g. "Prune et Amande"); for EN, mirror the same two colors, and keep all name strings in one data file so corrections are trivial.

Stat names FR to EN: Vitalite = Vitality, Initiative = Initiative, Invocation = Summons, Soins = Heals, Agilite = Agility, Chance = Chance, Force = Strength, Intelligence = Intelligence, Puissance = Power, Prospection = Prospecting, Critique = Critical, Portee = Range.

Every Dragoturkey gives 400 Vitality at level 200 (300 at level 100) on top of the bonuses listed below. Bonus values below are level 200 values. Stats scale with mount level (fast from 1 to 100, slow from 101 to 200); storing the level 200 value is enough for phase 1.

Generation 1 is the only one obtainable in the wild. All other colors come exclusively from breeding. Dragoturkeys have exactly ONE possible cross per color, including odd generations (this is specific to Dragoturkeys; Seemyools and Rhineetles differ, phase 3 problem).

### Generation 1 (wild capture only)

| Color (FR) | Bonus (level 200) | How to obtain |
|---|---|---|
| Amande | 1700 Initiative | Wild capture |
| Doree | 2 Invocations | Wild capture |
| Rousse | 60 Soins | Wild capture |

Wild capture info (for the detail panel): captured in the "Territoire des dragodindes sauvages" (EN: Wild Dragoturkey Territory) in the Koalak Mountain area, nearest zaap "Village des Eleveurs" at [-16,1]. Wild dragoturkeys are level 62-70 monsters. Capturing requires a capture net crafted by the Breeder profession, which grants the "Mount Taming" spell in combat. A character must be level 60 to equip a Dragoturkey.

### Generation 2

| Color (FR) | Cross (parent A + parent B) | Bonus |
|---|---|---|
| Amande et Rousse | Amande + Rousse | 60 Soins, 1200 Initiative |
| Doree et Rousse | Doree + Rousse | 1 Invocation, 45 Soins |
| Amande et Doree | Amande + Doree | 1 Invocation, 1200 Initiative |

### Generation 3

| Color (FR) | Cross | Bonus |
|---|---|---|
| Ebene | Amande et Doree + Doree et Rousse | 120 Agilite |
| Indigo | Amande et Doree + Amande et Rousse | 120 Chance |

### Generation 4

| Color (FR) | Cross | Bonus |
|---|---|---|
| Indigo et Rousse | Indigo + Rousse | 90 Chance, 45 Soins |
| Ebene et Rousse | Ebene + Rousse | 90 Agilite, 45 Soins |
| Amande et Indigo | Amande + Indigo | 90 Chance, 1200 Initiative |
| Amande et Ebene | Amande + Ebene | 120 Agilite, 1200 Initiative |
| Doree et Indigo | Doree + Indigo | 90 Chance, 1 Invocation |
| Doree et Ebene | Doree + Ebene | 90 Agilite, 1 Invocation |
| Ebene et Indigo | Ebene + Indigo | 90 Chance, 90 Agilite |

### Generation 5

| Color (FR) | Cross | Bonus |
|---|---|---|
| Pourpre | Ebene et Indigo + Amande et Rousse | 120 Force |
| Orchidee | Ebene et Indigo + Doree et Rousse | 120 Intelligence |

### Generation 6

| Color (FR) | Cross | Bonus |
|---|---|---|
| Pourpre et Rousse | Pourpre + Rousse | 90 Force, 45 Soins |
| Orchidee et Rousse | Orchidee + Rousse | 90 Intelligence, 45 Soins |
| Amande et Pourpre | Amande + Pourpre | 90 Force, 1200 Initiative |
| Amande et Orchidee | Amande + Orchidee | 90 Intelligence, 1200 Initiative |
| Doree et Pourpre | Doree + Pourpre | 90 Force, 1 Invocation |
| Doree et Orchidee | Doree + Orchidee | 90 Intelligence, 1 Invocation |
| Indigo et Pourpre | Indigo + Pourpre | 90 Force, 90 Chance |
| Indigo et Orchidee | Indigo + Orchidee | 90 Intelligence, 90 Chance |
| Ebene et Pourpre | Ebene + Pourpre | 90 Force, 90 Agilite |
| Ebene et Orchidee | Ebene + Orchidee | 90 Intelligence, 90 Agilite |
| Orchidee et Pourpre | Orchidee + Pourpre | 90 Force, 90 Intelligence |

### Generation 7

| Color (FR) | Cross | Bonus |
|---|---|---|
| Ivoire | Orchidee et Pourpre + Indigo et Pourpre | 90 Puissance |
| Turquoise | Orchidee et Pourpre + Ebene et Orchidee | 90 Prospection |

### Generation 8

| Color (FR) | Cross | Bonus |
|---|---|---|
| Ivoire et Rousse | Ivoire + Rousse | 70 Puissance, 45 Soins |
| Turquoise et Rousse | Turquoise + Rousse | 45 Soins, 70 Prospection |
| Amande et Ivoire | Amande + Ivoire | 70 Puissance, 1200 Initiative |
| Amande et Turquoise | Amande + Turquoise | 70 Prospection, 1200 Initiative |
| Doree et Ivoire | Doree + Ivoire | 70 Puissance, 1 Invocation |
| Doree et Turquoise | Doree + Turquoise | 1 Invocation, 70 Prospection |
| Indigo et Ivoire | Indigo + Ivoire | 90 Chance, 70 Puissance |
| Indigo et Turquoise | Indigo + Turquoise | 90 Chance, 70 Prospection |
| Ebene et Ivoire | Ebene + Ivoire | 90 Agilite, 70 Puissance |
| Ebene et Turquoise | Ebene + Turquoise | 90 Agilite, 70 Prospection |
| Ivoire et Pourpre | Ivoire + Pourpre | 90 Force, 70 Puissance |
| Turquoise et Pourpre | Turquoise + Pourpre | 90 Force, 70 Prospection |
| Ivoire et Orchidee | Ivoire + Orchidee | 90 Intelligence, 70 Puissance |
| Turquoise et Orchidee | Turquoise + Orchidee | 90 Intelligence, 70 Prospection |
| Ivoire et Turquoise | Ivoire + Turquoise | 70 Puissance, 70 Prospection |

### Generation 9

| Color (FR) | Cross | Bonus |
|---|---|---|
| Emeraude | Ivoire et Turquoise + Ivoire et Pourpre | 14% Critique |
| Prune | Ivoire et Turquoise + Turquoise et Orchidee | 2 Portee |

### Generation 10

| Color (FR) | Cross | Bonus |
|---|---|---|
| Emeraude et Rousse | Emeraude + Rousse | 10% Critique, 45 Soins |
| Prune et Rousse | Prune + Rousse | 1 Portee, 45 Soins |
| Amande et Emeraude | Amande + Emeraude | 10% Critique, 1200 Initiative |
| Prune et Amande | Prune + Amande | 1 Portee, 1200 Initiative |
| Doree et Emeraude | Doree + Emeraude | 10% Critique, 1 Invocation |
| Prune et Doree | Prune + Doree | 1 Portee, 1 Invocation |
| Emeraude et Indigo | Emeraude + Indigo | 90 Chance, 10% Critique |
| Prune et Indigo | Prune + Indigo | 90 Chance, 1 Portee |
| Ebene et Emeraude | Ebene + Emeraude | 90 Agilite, 10% Critique |
| Prune et Ebene | Prune + Ebene | 90 Agilite, 1 Portee |
| Emeraude et Pourpre | Emeraude + Pourpre | 90 Force, 10% Critique |
| Prune et Pourpre | Prune + Pourpre | 90 Force, 1 Portee |
| Emeraude et Orchidee | Emeraude + Orchidee | 90 Intelligence, 10% Critique |
| Prune et Orchidee | Prune + Orchidee | 90 Intelligence, 1 Portee |
| Emeraude et Ivoire | Emeraude + Ivoire | 70 Puissance, 10% Critique |
| Prune et Ivoire | Prune + Ivoire | 70 Puissance, 1 Portee |
| Emeraude et Turquoise | Emeraude + Turquoise | 10% Critique, 70 Prospection |
| Prune et Turquoise | Prune + Turquoise | 1 Portee, 70 Prospection |
| Prune et Emeraude | Prune + Emeraude | 10% Critique, 1 Portee |

Sanity check: 3 + 3 + 2 + 7 + 2 + 11 + 2 + 15 + 2 + 19 = 66 colors. Write a data integrity test that asserts this count.

### Special Dragoturkeys (not part of the breeding tree)

Two special mounts cannot be bred, only leveled. They are bought from the NPC Gladiagob at the Trool Fair [-11,-37] for 50 Gladiatokens each. Display them in a separate small "Special" section, clearly outside the tree.

| Name (FR) | Bonus |
|---|---|
| Dragodinde en armure | 70 Puissance, 7% resistance in each element (Neutral, Earth, Fire, Water, Air) |
| Dragodinde a Plumes | 400 Vitalite, 40 Dommages Renvoyes (reflected damage) |

## 4. Breeding mechanics (Dofus 3.5 rules, needed for tooltips and for phase 2)

Encode these rules as documented constants and pure functions in `src/core/breeding.ts`, even though phase 1 only displays them as informational content. Phase 2 will consume them.

- Mating requires two fecund mounts of the same species and opposite genders. A mount becomes fecund when its endurance, maturity and love gauges are maxed (20000 each) in a paddock.
- Each mating produces exactly ONE baby, instantly (no gestation anymore). Both parents become sterile afterward. If one parent has the rare Reproducer capacity, the mating gives 2 babies.
- Cloning: two sterile (or fertile) mounts of the same generation and species can be merged into one new fertile mount, randomly one of the two (same color, gender and genealogy, gauges reset, capacity lost). So one breeding couple can yield at most 2 mounts total: 1 baby plus 1 clone recovered from the 2 spent parents.
- A mount's genealogy tree stops at the grandparents. The baby's color depends only on the two parents and the four grandparents.
- Target generation: the highest generation reachable given the colors present in both parents and their genealogy. The baby has a base 30% chance to be of the target generation, plus 0.15% per level summed across both parents (two level 200 parents add 60%), plus 10% if an Optimakina consumable is used. Cap at 100%. Once per year an Almanax bonus (Takeza day) adds another 20%.
- If several colors are possible within the target generation, that probability is split among them, weighted by genealogy. For Dragoturkeys with clean trees (parents are exactly the recipe colors, no exotic grandparents), the target generation has a single possible color, so no split.
- The remaining probability is distributed across the other possibilities: the parents' colors, the grandparents' colors and valid crosses between the two trees. Parents weigh more than grandparents, higher generations are less likely, and colors present multiple times in the trees are more likely. The exact weights of this residual distribution are not publicly documented (the in-game mating interface displays exact percentages). Model only the target-generation formula as exact math; present the residual distribution as qualitative information.

Practical consequence to surface in the UI and to use in phase 2: with two level 200 parents of exactly the right recipe colors, the desired baby is 90% likely, and 100% with an Optimakina. Expected number of matings for one desired baby is 1/p.

## 5. Data model

Define types along these lines in `src/data/types.ts` (adjust names as you see fit, keep them strict):

```ts
type SpeciesId = 'dragoturkey' | 'seemyool' | 'rhineetle';

interface MountColor {
  id: string;                 // kebab-case English, e.g. 'almond-ginger', 'crimson'
  species: SpeciesId;
  generation: number;         // 1..10
  kind: 'mono' | 'bicolor';   // gen 1/3/5/7/9 are mono, even gens are bicolor
  name: { fr: string; en: string };
  bonuses: Bonus[];           // excludes the species-wide Vitality, which is implicit
  cross?: [string, string];   // the two parent color ids; absent for generation 1
  wildCapture?: boolean;      // true for generation 1
}

interface Bonus {
  stat: StatId;               // e.g. 'initiative', 'heals', 'critical'
  value: number;
  unit?: '%' | 'flat';
}
```

Derive the reverse index (which crosses each color participates in, i.e. its children) at load time instead of storing it. Keep all data and derivations pure and side-effect free so phase 2 can reuse them for recursive computation.

## 6. Phase 1 features

1. Breeding tree view (the core screen). Generations 1 to 10 laid out as columns left to right, one node per color. Edges connect each color to its two recipe parents. The graph is a DAG, dense in the middle generations, so:
   - pan and zoom (touch friendly, many users will be on mobile)
   - clicking or tapping a node selects it, highlights its complete ancestry (recursive lineage back to generation 1) and dims the rest, like a game skill tree
   - a small legend explaining mono vs bicolor generations
2. Detail panel (drawer on mobile, side panel on desktop) for the selected color: name in current language, generation, bonuses, how to obtain (the exact cross, or wild capture info for generation 1), and the list of colors it can produce as a parent.
3. Search and filters: search by name (works in both languages regardless of the active one), filter by generation and by bonus stat.
4. Language switcher FR/EN in the header. Default from browser language, persisted in localStorage. All UI strings translated, no hardcoded text in components.
5. Species tabs: Dragoturkeys active; Seemyools and Rhineetles visible but disabled with a "coming soon" label. Do not stub fake data for them.
6. A short "How breeding works" page summarizing section 4 in both languages (good for users and for SEO).
7. Special mounts section as described in section 3.
8. Dark fantasy-leaning visual theme that fits the Dofus vibe without using any Ankama asset. No game artwork, no ripped sprites, no official logos. Simple color swatches or generated glyphs are fine for node visuals. The footer must state that this is an unofficial fan project and that Dofus is a trademark of Ankama, with no affiliation.

## 7. Quality bar

- TypeScript strict, Biome passing, no `any`
- Data integrity tests with bun test: 66 colors total, correct count per generation, every `cross` references existing ids of strictly lower generations, generation 1 entries have `wildCapture` and no `cross`, every other color has exactly one cross, even generations are bicolor and odd generations are mono
- Sensible component structure, no premature abstraction
- Meta tags, page titles per language, favicon
- Conventional commits, commit as you go in coherent steps

## 8. Documentation

Documentation is a first-class deliverable, on par with the code. The goal is legacy: a newcomer (human or AI agent) must be able to understand the app, its design rationale and its code without asking anyone. All repository documentation is written in English; user-facing explanations inside the app stay bilingual through i18n as specified in section 6.

Structure to produce:

- `README.md` (root, the entry point): what Dragoarbre is and why it exists, key features with a screenshot placeholder, link to the live site, quickstart (install, dev, test, build), tech stack summary, a map of the documentation with links to every doc below, the Ankama disclaimer, a note that data reflects the Dofus 3.5 breeding rework, and a short French summary section at the end.
- `docs/OVERVIEW.md` (the main doc): explains the app from a product point of view. The problem it solves for players, the domain explained for a reader who has never played Dofus (mounts, generations, crosses, the target-generation probability system), how each screen works, and the phase roadmap (phase 2 shopping-list planner, phase 3 Seemyools and Rhineetles).
- `docs/ARCHITECTURE.md` (the technical doc): folder structure and the responsibility of each module, the data model and its invariants (mirroring the integrity tests), how the tree layout and lineage highlighting are computed, the breeding math module and its formulas, the i18n setup, the state management approach, the build and GitHub Pages deployment pipeline, and how to run everything locally. Include Mermaid diagrams (GitHub renders them natively): at minimum a module dependency diagram and a data-flow diagram from the data files to the rendered tree.
- `docs/DECISIONS.md` (conception log): a lightweight architecture decision record. One short entry per significant choice with context, decision and consequences: Bun plus Vite, HashRouter for GitHub Pages, static typed data files instead of a backend, modelling only the target-generation formula as exact math, custom SVG versus a graph library (whichever you chose and why), styling approach, and any other call you made. In later phases, append new entries; never rewrite past ones.
- `docs/DATA.md`: everything about the game data. Where each dataset lives, the meaning of every field, the sourcing rule (data comes only from user-provided briefs, never invented or scraped), how to correct a wrong value, and a checklist for adding a new species in phase 3.
- `CONTRIBUTING.md` (root, short): setup, commands, code style, commit conventions, the documentation-sync rule below, and how to propose data corrections.

Code-level documentation:

- TSDoc comments on every exported function and type, with concrete examples on the breeding math functions (inputs, output, the formula applied).
- Each data file starts with a header comment stating its source brief and last-verified date.
- Comments explain why, not what. No noise comments restating the code.

Maintenance rules (record them in CLAUDE.md too):

- Documentation is updated in the same commit as the code it describes. A feature is not done if the docs lie about it.
- Every phase ends with a documentation pass bringing README, OVERVIEW, ARCHITECTURE and DECISIONS up to date.

## 9. Project scaffolding and deployment

- Initialize a git repo, `bun create vite` (react-ts template) or equivalent, then wire Tailwind, Biome, i18next
- Create a `CLAUDE.md` at the root documenting: the commands (dev, build, test, lint), where data lives, the phase roadmap (phase 2 shopping list planner, phase 3 Seemyools and Rhineetles), the documentation maintenance rules from section 8, and the hard rule that game data is never invented, only added from user-provided sources
- README.md and the full documentation set as specified in section 8
- MIT license
- GitHub Actions workflow `.github/workflows/deploy.yml`: on push to main, setup Bun (oven-sh/setup-bun), `bun install --frozen-lockfile`, run tests, `bun run build`, then deploy `dist` to GitHub Pages using the official actions (configure-pages, upload-pages-artifact, deploy-pages). Note in the README that the repository owner must set Pages source to "GitHub Actions" in the repo settings once.

## 10. Definition of done for phase 1

- `bun install && bun run dev` works from a fresh clone
- `bun test` and lint pass
- The tree renders all 66 Dragoturkeys with correct edges, lineage highlighting works, detail panel is complete
- Full FR/EN switching with no untranslated strings
- The documentation set from section 8 exists, is accurate against the shipped code, and CLAUDE.md records the maintenance rules
- CI builds and the site deploys to GitHub Pages

Start by scaffolding the project, then the data layer with its tests, then the tree view. Ask the user only if something in this brief is contradictory or blocking; otherwise make reasonable calls and note them in CLAUDE.md.
