import { type ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { BreedingPlan } from '../../core/planner'
import { getColorById, getLineageIds, type MountColor } from '../../data'
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

  // Only the ancestry is passed in: BreedingTree lays out and draws edges from
  // whatever list it receives, so restricting the list restricts the diagram.
  const lineageColors = useMemo<MountColor[]>(() => {
    const colors: MountColor[] = []
    for (const id of getLineageIds(plan.targetId)) {
      const color = getColorById(id)
      if (color) colors.push(color)
    }
    return colors
  }, [plan.targetId])

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
        />
      </div>
    </section>
  )
}
