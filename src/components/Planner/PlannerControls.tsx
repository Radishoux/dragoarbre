import { type ReactNode, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_PLANNER_SETTINGS,
  PARENT_LEVEL_MAX,
  PARENT_LEVEL_MIN,
  type PlannerSettings,
} from '../../core/planner'
import { getColorsBySpecies, type MountColor } from '../../data'
import { useLocalizedName } from '../../hooks/useLocalizedName'
import { type PlanUrlState, planSpecies, QUANTITY_MAX, QUANTITY_MIN } from '../../utils/planUrl'
import { matchesSearch } from '../../utils/search'

interface PlannerControlsProps {
  state: PlanUrlState
  onTargetChange: (targetId: string | null) => void
  onQuantityChange: (quantity: number) => void
  onSettingsChange: (settings: PlannerSettings) => void
}

const fieldClass =
  'rounded border border-(--color-border) bg-(--color-panel-raised) px-3 py-2 text-sm text-(--color-text) placeholder:text-(--color-text-muted) focus:border-(--color-accent) focus:outline-none'

/** A labelled checkbox with its own explanatory hint, sized for touch. */
function ToggleField({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (next: boolean) => void
}): ReactNode {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded border border-(--color-border) bg-(--color-panel-raised) p-3 has-[:checked]:border-(--color-accent)">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-(--color-accent)"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-(--color-text)">{label}</span>
        <span className="block text-xs text-(--color-text-muted)">{hint}</span>
      </span>
    </label>
  )
}

/**
 * Every planner input: the target colour, the quantity and the six plan-wide
 * settings.
 *
 * The component is fully controlled — it owns no plan state, only the
 * throwaway search text used to narrow the target list. That keeps the URL the
 * single source of truth for anything a shared link must restore.
 */
export function PlannerControls({
  state,
  onTargetChange,
  onQuantityChange,
  onSettingsChange,
}: PlannerControlsProps): ReactNode {
  const { t } = useTranslation()
  const { language } = useLocalizedName()
  const [query, setQuery] = useState('')

  const searchId = useId()
  const targetId = useId()
  const quantityId = useId()
  const levelId = useId()

  // The plan's species, which the target itself decides when there is one —
  // so the picker can never offer a colour the plan cannot reach.
  const species = planSpecies(state)

  // Grouped by generation so a 19-colour generation stays scannable in the
  // native picker. The current target always survives the filter, otherwise
  // typing a search would blank out the selection.
  const groups = useMemo(() => {
    const byGeneration = new Map<number, MountColor[]>()
    for (const color of getColorsBySpecies(species)) {
      if (color.id !== state.targetId && !matchesSearch(color, query)) continue
      const bucket = byGeneration.get(color.generation) ?? []
      bucket.push(color)
      byGeneration.set(color.generation, bucket)
    }
    const name = (color: MountColor) => (language === 'fr' ? color.name.fr : color.name.en)
    return [...byGeneration.entries()]
      .sort(([a], [b]) => a - b)
      .map(([generation, colors]) => ({
        generation,
        colors: [...colors].sort((a, b) => name(a).localeCompare(name(b), language)),
      }))
  }, [species, query, state.targetId, language])

  const isDefaultSettings =
    state.settings.parentLevel === DEFAULT_PLANNER_SETTINGS.parentLevel &&
    state.settings.optimakina === DEFAULT_PLANNER_SETTINGS.optimakina &&
    state.settings.almanaxTakeza === DEFAULT_PLANNER_SETTINGS.almanaxTakeza &&
    state.settings.cloning === DEFAULT_PLANNER_SETTINGS.cloning &&
    state.settings.reproducteur === DEFAULT_PLANNER_SETTINGS.reproducteur &&
    state.settings.captureNet === DEFAULT_PLANNER_SETTINGS.captureNet

  return (
    <section className="space-y-4 rounded-lg border border-(--color-border) bg-(--color-panel) p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          {/* A group heading rather than a <label>: two controls sit under it,
              and each carries its own distinct accessible name below. */}
          <span className="block text-xs font-semibold tracking-wide text-(--color-gold) uppercase">
            {t('planner.targetLabel')}
          </span>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('planner.targetPlaceholder')}
            aria-label={t('planner.targetPlaceholder')}
            className={`w-full ${fieldClass}`}
          />
          <label htmlFor={targetId} className="sr-only">
            {t('planner.targetLabel')}
          </label>
          <select
            id={targetId}
            value={state.targetId ?? ''}
            onChange={(event) => onTargetChange(event.target.value || null)}
            className={`w-full ${fieldClass}`}
          >
            <option value="">{t('planner.targetNone')}</option>
            {groups.map((group) => (
              <optgroup
                key={group.generation}
                label={t('planner.generationHeading', { gen: group.generation })}
              >
                {group.colors.map((color) => (
                  <option key={color.id} value={color.id}>
                    {language === 'fr' ? color.name.fr : color.name.en}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor={quantityId}
            className="block text-xs font-semibold tracking-wide text-(--color-gold) uppercase"
          >
            {t('planner.quantityLabel')}
          </label>
          <input
            id={quantityId}
            type="number"
            inputMode="numeric"
            min={QUANTITY_MIN}
            max={QUANTITY_MAX}
            step={1}
            value={state.quantity}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10)
              onQuantityChange(Number.isFinite(parsed) ? parsed : QUANTITY_MIN)
            }}
            className={`w-full sm:w-28 ${fieldClass}`}
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-(--color-border) pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold tracking-wide text-(--color-gold) uppercase">
            {t('planner.settingsTitle')}
          </h2>
          {!isDefaultSettings && (
            <button
              type="button"
              onClick={() => onSettingsChange(DEFAULT_PLANNER_SETTINGS)}
              className="rounded border border-(--color-border) px-2 py-1.5 text-xs text-(--color-text-muted) hover:border-(--color-accent) hover:text-(--color-text)"
            >
              {t('planner.reset')}
            </button>
          )}
        </div>

        <div className="rounded border border-(--color-border) bg-(--color-panel-raised) p-3">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={levelId} className="text-sm font-medium text-(--color-text)">
              {t('planner.parentLevelLabel')}
            </label>
            {/* The range input already announces its own value; the visible
                number is for sighted users only, so it is hidden from AT. */}
            <output htmlFor={levelId} aria-hidden="true" className="text-sm text-(--color-gold)">
              {state.settings.parentLevel}
            </output>
          </div>
          <input
            id={levelId}
            type="range"
            min={PARENT_LEVEL_MIN}
            max={PARENT_LEVEL_MAX}
            step={1}
            value={state.settings.parentLevel}
            onChange={(event) =>
              onSettingsChange({
                ...state.settings,
                parentLevel: Number.parseInt(event.target.value, 10),
              })
            }
            className="mt-2 h-6 w-full accent-(--color-accent)"
          />
          <p className="text-xs text-(--color-text-muted)">{t('planner.parentLevelHint')}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <ToggleField
            label={t('planner.optimakinaLabel')}
            hint={t('planner.optimakinaHint')}
            checked={state.settings.optimakina}
            onChange={(optimakina) => onSettingsChange({ ...state.settings, optimakina })}
          />
          <ToggleField
            label={t('planner.takezaLabel')}
            hint={t('planner.takezaHint')}
            checked={state.settings.almanaxTakeza}
            onChange={(almanaxTakeza) => onSettingsChange({ ...state.settings, almanaxTakeza })}
          />
          <ToggleField
            label={t('planner.cloningLabel')}
            hint={t('planner.cloningHint')}
            checked={state.settings.cloning}
            onChange={(cloning) => onSettingsChange({ ...state.settings, cloning })}
          />
          <ToggleField
            label={t('planner.reproducteurLabel')}
            hint={t('planner.reproducteurHint')}
            checked={state.settings.reproducteur}
            onChange={(reproducteur) => onSettingsChange({ ...state.settings, reproducteur })}
          />
          {/* A net is a choice of three, not a flag, so it gets a select even
              though it sits among the toggles. Only the two whose yield is
              deterministic are offered — see `CaptureNet`. */}
          <label className="flex flex-col gap-1 rounded border border-(--color-border) bg-(--color-panel-raised) p-3">
            <span className="text-sm font-medium text-(--color-text)">
              {t('planner.captureNetLabel')}
            </span>
            <select
              value={state.settings.captureNet}
              onChange={(event) =>
                onSettingsChange({
                  ...state.settings,
                  captureNet: event.target.value as PlannerSettings['captureNet'],
                })
              }
              className={fieldClass}
            >
              <option value="universal">{t('planner.captureNetUniversal')}</option>
              <option value="multiplier">{t('planner.captureNetMultiplier')}</option>
            </select>
            <span className="text-xs text-(--color-text-muted)">{t('planner.captureNetHint')}</span>
          </label>
        </div>
      </div>
    </section>
  )
}
