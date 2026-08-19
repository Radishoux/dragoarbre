import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { BreedingTree, type NodeState } from '../components/BreedingTree/BreedingTree'
import { DetailPanel } from '../components/DetailPanel'
import { Legend } from '../components/Legend'
import { SearchFilters } from '../components/SearchFilters'
import { SpecialMounts } from '../components/SpecialMounts'
import { cheapestLineageIds, DEFAULT_PLANNER_SETTINGS, rankAllRecipes } from '../core/planner'
import { getColorById, getColorsBySpecies, type MountColor, type StatId } from '../data'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useLocalizedName } from '../hooks/useLocalizedName'
import { decodeSpecies } from '../utils/planUrl'
import { matchesSearch } from '../utils/search'

export function TreePage() {
  useDocumentTitle('nav.tree')
  const { t } = useTranslation()
  const { bareName } = useLocalizedName()
  const [searchParams] = useSearchParams()

  // The tree is scoped by the same `?species=` parameter the planner uses, so
  // the header tabs, a pasted link and the rendered tree can never disagree.
  const species = decodeSpecies(searchParams)
  const colors = useMemo(() => getColorsBySpecies(species), [species])

  // Ranked once per species at the planner's default assumptions. The tree has
  // no assumption controls of its own, so it shows the recipe a default plan
  // would breed — the same one `/planner` opens with.
  const rankings = useMemo(() => rankAllRecipes(DEFAULT_PLANNER_SETTINGS, colors), [colors])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [generation, setGeneration] = useState<number | null>(null)
  const [stat, setStat] = useState<StatId | null>(null)

  // The stats this species actually carries, in order of first appearance —
  // which is ascending generation, so the filter reads the way the tree does.
  const availableStats = useMemo(() => {
    const seen = new Set<StatId>()
    for (const color of colors) for (const bonus of color.bonuses) seen.add(bonus.stat)
    return [...seen]
  }, [colors])

  // A stat the new species does not carry is dropped rather than left set,
  // which would filter every node away and read as an empty tree.
  const activeStat = stat !== null && availableStats.includes(stat) ? stat : null

  const matchIds = useMemo(() => {
    const set = new Set<string>()
    for (const color of colors) {
      const matchesQuery = matchesSearch(color, query)
      const matchesGeneration = generation === null || color.generation === generation
      const matchesStat =
        activeStat === null || color.bonuses.some((bonus) => bonus.stat === activeStat)
      if (matchesQuery && matchesGeneration && matchesStat) set.add(color.id)
    }
    return set
  }, [colors, query, generation, activeStat])

  // A selection from another species is dropped rather than cleared in an
  // effect: switching tabs must not leave a Dragoturkey node selected on the
  // Seemyool tree, and deriving it keeps the URL the only thing that decides.
  const selectedColor = useMemo(() => {
    const color = selectedId ? getColorById(selectedId) : undefined
    return color?.species === species ? color : null
  }, [selectedId, species])
  const activeId = selectedColor?.id ?? null

  // Highlighting follows the cheapest-recipe path, matching the edges drawn
  // below. The union walk would light up 28 colours for a Rhineetle Plum where
  // the plan breeds 11, highlighting ancestors along paths nothing takes.
  const lineageIds = useMemo(
    () => (activeId ? new Set(cheapestLineageIds(activeId, rankings)) : null),
    [activeId, rankings],
  )

  const getNodeState = (id: string): NodeState => {
    if (!matchIds.has(id)) return 'dimmed'
    if (id === activeId) return 'selected'
    if (lineageIds) return lineageIds.has(id) ? 'lineage' : 'dimmed'
    return 'idle'
  }

  // A reveal belongs to the node it was opened on, so it survives only as long
  // as that node stays selected. Deriving it closes the reveal on a new
  // selection and on a species change at once, with no effect to keep in sync.
  const activeRevealedId = revealedId === activeId ? revealedId : null

  // One recipe per colour by default — the cheapest — with the selected node's
  // full set revealed on demand. Drawing all of them at once would put sixteen
  // edges on a single Rhineetle and make a 120-node tree unreadable.
  const parentsFor = useCallback(
    (color: MountColor): readonly string[] => {
      if (color.id === activeRevealedId) return [...new Set((color.crosses ?? []).flat())]
      const chosen = rankings.get(color.id)?.chosen
      return chosen ? [chosen.parentAId, chosen.parentBId] : []
    },
    [activeRevealedId, rankings],
  )

  // On a phone the panel stacks *below* a 420px-tall tree, so a tap updates
  // something entirely off-screen and reads as nothing happening. Bring it into
  // view — but only when stacked; on desktop it already sits alongside and
  // scrolling would yank the page for no reason.
  const panelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!activeId) return
    if (window.matchMedia('(min-width: 768px)').matches) return
    // `start`, not `nearest`: the panel's top edge sits a few pixels inside a
    // phone viewport, so `nearest` judges it visible and does nothing while the
    // content itself is entirely below the fold.
    //
    // `auto`, not `smooth`: smooth scrolling is a no-op in some engines, and an
    // instant jump is the better interaction here anyway — you tapped a colour
    // to read about it, so arriving immediately beats a 300ms glide.
    panelRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [activeId])

  const handleToggleReveal = useCallback(
    (id: string) => setRevealedId((current) => (current === id ? null : id)),
    [],
  )

  // Guards a species whose dataset is missing. Unreachable with all three
  // shipped, but the tree renders nothing useful without colours and an empty
  // canvas would read as a bug rather than as missing data.
  if (colors.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <h2 className="text-lg font-semibold text-(--color-text)">{t('species.emptyTitle')}</h2>
        <p className="text-sm text-(--color-text-muted)">{t('species.emptyBody')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <SearchFilters
        query={query}
        onQueryChange={setQuery}
        generation={generation}
        onGenerationChange={setGeneration}
        stat={activeStat}
        onStatChange={setStat}
        stats={availableStats}
      />
      {matchIds.size === 0 && (
        <p className="text-sm text-(--color-text-muted)">{t('tree.search.noResults')}</p>
      )}
      <Legend />
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        <BreedingTree
          colors={colors}
          selectedId={activeId}
          onSelect={setSelectedId}
          getNodeState={getNodeState}
          nameFor={bareName}
          parentsFor={parentsFor}
          revealedId={activeRevealedId}
          onToggleReveal={handleToggleReveal}
        />
        <div ref={panelRef} className="flex md:w-80 md:shrink-0">
          <DetailPanel
            color={selectedColor}
            ranking={selectedColor ? (rankings.get(selectedColor.id) ?? null) : null}
            onSelect={setSelectedId}
            onClose={activeId ? () => setSelectedId(null) : undefined}
          />
        </div>
      </div>
      {/* The special mounts are Dragoturkey-only game content; the other two
          species have no equivalent, so the section is not just empty there. */}
      {species === 'dragoturkey' && <SpecialMounts />}
    </div>
  )
}
