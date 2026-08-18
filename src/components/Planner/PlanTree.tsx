import { type ReactNode, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { BreedingPlan } from '../../core/planner'
import { getColorById, type MountColor } from '../../data'
import { useLocalizedName } from '../../hooks/useLocalizedName'
import { BreedingTree, type NodeState } from '../BreedingTree/BreedingTree'

interface PlanTreeProps {
  plan: BreedingPlan
  /** Re-targets the plan at the clicked colour. */
  onSelect: (colorId: string) => void
}

/**
 * The phase 1 breeding tree, cut down to the target's ancestry and annotated
 * with how many of each colour the plan needs.
 *
 * Badges carry the *safe* (ceiled) count rather than the expected value: the
 * badge is read at a glance off a small node, and "3" is actionable where
 * "2.5" is not. The decimal expectation stays available in the breakdown
 * table, which has the room to explain itself.
 */
export function PlanTree({ plan, onSelect }: PlanTreeProps): ReactNode {
  const { t } = useTranslation()
  const { bareName } = useLocalizedName()

  // Only the plan's own colours are passed in: BreedingTree lays out and draws
  // edges from whatever list it receives, so restricting the list restricts the
  // diagram. This is the plan's colour set rather than `getLineageIds`, which
  // walks every recipe — for a 12-recipe Rhineetle that is 28 colours where the
  // plan breeds 11, and the extra 17 would sit there with no badge and, since
  // the plan mates no pair for them, no edges either.
  const lineageColors = useMemo<MountColor[]>(() => {
    const colors: MountColor[] = []
    for (const entry of plan.colors) {
      const color = getColorById(entry.colorId)
      if (color) colors.push(color)
    }
    return colors
  }, [plan.colors])

  // Plain digits, deliberately not locale-grouped: a badge pill is only a few
  // characters wide, and TreeNode parses the text back to a number to build its
  // accessible label — a French thin-space group separator would truncate it.
  const badges = useMemo<ReadonlyMap<string, string>>(
    () => new Map(plan.colors.map((entry) => [entry.colorId, String(entry.safe)])),
    [plan.colors],
  )

  // Every colour in the list is by construction part of the plan, so the only
  // distinction left to draw is target versus the rest of its lineage.
  const getNodeState = (id: string): NodeState => (id === plan.targetId ? 'selected' : 'lineage')

  // The plan mates exactly one pair per colour, so the diagram draws that pair
  // and not the alternatives: a 12-recipe target would otherwise sprout edges
  // to parents the plan never breeds and shows no count for.
  const parentsByChild = useMemo(
    () => new Map(plan.pairs.map((pair) => [pair.childId, [pair.parentAId, pair.parentBId]])),
    [plan.pairs],
  )
  const parentsFor = useCallback(
    (color: MountColor) => parentsByChild.get(color.id) ?? [],
    [parentsByChild],
  )

  return (
    <section className="flex min-h-0 flex-col">
      <h2 className="mb-1 text-xs font-semibold tracking-wide text-(--color-gold) uppercase">
        {t('planner.treeTitle')}
      </h2>
      <p className="mb-2 text-xs text-(--color-text-muted)">{t('planner.treeHint')}</p>
      {/* BreedingTree sizes its SVG with `h-full`, which only resolves against
          an ancestor of *definite* height — a bare `min-height` leaves it to
          collapse to intrinsic content height while the fit transform still
          centres against the taller container, pushing every node out of view.
          Phase 1 gets that height from TreePage's flex row; the planner is a
          plain vertical stack, so it has to state one explicitly. */}
      <div className="flex h-[460px] flex-col md:h-[560px]">
        <BreedingTree
          colors={lineageColors}
          selectedId={plan.targetId}
          onSelect={onSelect}
          getNodeState={getNodeState}
          nameFor={bareName}
          badges={badges}
          parentsFor={parentsFor}
        />
      </div>
    </section>
  )
}
