import { useTranslation } from 'react-i18next'
import type { StatId } from '../data'

const GENERATIONS = Array.from({ length: 10 }, (_, i) => i + 1)
const STATS: StatId[] = [
  'vitality',
  'initiative',
  'summons',
  'heals',
  'agility',
  'chance',
  'strength',
  'intelligence',
  'power',
  'prospecting',
  'critical',
  'range',
]

interface SearchFiltersProps {
  query: string
  onQueryChange: (value: string) => void
  generation: number | null
  onGenerationChange: (value: number | null) => void
  stat: StatId | null
  onStatChange: (value: StatId | null) => void
}

export function SearchFilters({
  query,
  onQueryChange,
  generation,
  onGenerationChange,
  stat,
  onStatChange,
}: SearchFiltersProps) {
  const { t } = useTranslation()
  const hasActiveFilters = query !== '' || generation !== null || stat !== null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={t('tree.search.placeholder')}
        className="min-w-48 flex-1 rounded border border-(--color-border) bg-(--color-panel) px-3 py-1.5 text-sm text-(--color-text) placeholder:text-(--color-text-muted) focus:border-(--color-accent) focus:outline-none"
      />
      <select
        value={generation ?? ''}
        onChange={(event) =>
          onGenerationChange(event.target.value ? Number(event.target.value) : null)
        }
        className="rounded border border-(--color-border) bg-(--color-panel) px-2 py-1.5 text-sm text-(--color-text)"
        aria-label={t('tree.filters.generation')}
      >
        <option value="">{t('tree.filters.allGenerations')}</option>
        {GENERATIONS.map((gen) => (
          <option key={gen} value={gen}>
            {t('tree.generationColumn', { gen })}
          </option>
        ))}
      </select>
      <select
        value={stat ?? ''}
        onChange={(event) => onStatChange((event.target.value || null) as StatId | null)}
        className="rounded border border-(--color-border) bg-(--color-panel) px-2 py-1.5 text-sm text-(--color-text)"
        aria-label={t('tree.filters.stat')}
      >
        <option value="">{t('tree.filters.allStats')}</option>
        {STATS.map((statId) => (
          <option key={statId} value={statId}>
            {t(`stats.${statId}`)}
          </option>
        ))}
      </select>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={() => {
            onQueryChange('')
            onGenerationChange(null)
            onStatChange(null)
          }}
          className="rounded border border-(--color-border) px-2 py-1.5 text-xs text-(--color-text-muted) hover:border-(--color-accent) hover:text-(--color-text)"
        >
          {t('tree.filters.reset')}
        </button>
      )}
    </div>
  )
}
