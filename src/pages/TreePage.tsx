import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BreedingTree, type NodeState } from '../components/BreedingTree/BreedingTree'
import { DetailPanel } from '../components/DetailPanel'
import { Legend } from '../components/Legend'
import { SearchFilters } from '../components/SearchFilters'
import { SpecialMounts } from '../components/SpecialMounts'
import { DRAGOTURKEY_COLORS, getColorById, getLineageIds, type StatId } from '../data'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useLocalizedName } from '../hooks/useLocalizedName'
import { matchesSearch } from '../utils/search'

export function TreePage() {
  useDocumentTitle('nav.tree')
  const { t } = useTranslation()
  const { bareName } = useLocalizedName()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [generation, setGeneration] = useState<number | null>(null)
  const [stat, setStat] = useState<StatId | null>(null)

  const matchIds = useMemo(() => {
    const set = new Set<string>()
    for (const color of DRAGOTURKEY_COLORS) {
      const matchesQuery = matchesSearch(color, query)
      const matchesGeneration = generation === null || color.generation === generation
      const matchesStat = stat === null || color.bonuses.some((bonus) => bonus.stat === stat)
      if (matchesQuery && matchesGeneration && matchesStat) set.add(color.id)
    }
    return set
  }, [query, generation, stat])

  const lineageIds = useMemo(
    () => (selectedId ? new Set(getLineageIds(selectedId)) : null),
    [selectedId],
  )

  const getNodeState = (id: string): NodeState => {
    if (!matchIds.has(id)) return 'dimmed'
    if (id === selectedId) return 'selected'
    if (lineageIds) return lineageIds.has(id) ? 'lineage' : 'dimmed'
    return 'idle'
  }

  const selectedColor = selectedId ? (getColorById(selectedId) ?? null) : null

  return (
    <div className="flex flex-1 flex-col gap-3">
      <SearchFilters
        query={query}
        onQueryChange={setQuery}
        generation={generation}
        onGenerationChange={setGeneration}
        stat={stat}
        onStatChange={setStat}
      />
      {matchIds.size === 0 && (
        <p className="text-sm text-(--color-text-muted)">{t('tree.search.noResults')}</p>
      )}
      <Legend />
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:flex-row">
        <BreedingTree
          colors={DRAGOTURKEY_COLORS}
          selectedId={selectedId}
          onSelect={setSelectedId}
          getNodeState={getNodeState}
          nameFor={bareName}
        />
        <DetailPanel
          color={selectedColor}
          onSelect={setSelectedId}
          onClose={selectedId ? () => setSelectedId(null) : undefined}
        />
      </div>
      <SpecialMounts />
    </div>
  )
}
