import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { MountColor } from '../../data'
import { computeTreeLayout, NODE_HEIGHT, NODE_WIDTH } from './layout'
import { TreeNode } from './TreeNode'
import { usePanZoom } from './usePanZoom'

export type NodeState = 'selected' | 'lineage' | 'dimmed' | 'idle'

interface BreedingTreeProps {
  colors: readonly MountColor[]
  selectedId: string | null
  onSelect: (id: string) => void
  getNodeState: (id: string) => NodeState
  nameFor: (color: MountColor) => string
  /** Phase 2, optional: colour id -> short badge text (e.g. "2.5"). Ids absent render no badge. */
  badges?: ReadonlyMap<string, string>
  /**
   * Phase 3, optional: which parents to draw edges from for a colour.
   *
   * Defaults to every parent across every recipe. That was right while each
   * colour had exactly one recipe, but a Rhineetle with 12 of them would draw
   * an edge to sixteen parents at once, so callers narrow it — the tree page
   * to the cheapest recipe, the planner to the pair the plan actually mates.
   *
   * Memoize it: it is a dependency of the edge computation.
   */
  parentsFor?: (color: MountColor) => readonly string[]
  /**
   * Phase 3, optional: the colour whose every recipe is currently revealed.
   * The toggle that sets it is drawn on the selected node only, so this is
   * normally either `null` or the selected id.
   */
  revealedId?: string | null
  /** Toggles {@link revealedId}. Absent leaves the reveal control unrendered. */
  onToggleReveal?: (id: string) => void
}

/** Every distinct parent across all of a colour's recipes — the phase 1 default. */
function allParents(color: MountColor): readonly string[] {
  // A parent shared by two recipes of the same child would otherwise draw the
  // identical line twice, and duplicate React keys with it.
  return [...new Set((color.crosses ?? []).flat())]
}

/**
 * The pan/zoom breeding-tree SVG: one column per generation, cubic edges along
 * each `crosses` edge, and one {@link TreeNode} per colour.
 *
 * `colors` may be any subset of a species' colours — the planner passes only a
 * target's ancestry — and `badges` is purely additive decoration on top.
 */
export function BreedingTree({
  colors,
  onSelect,
  getNodeState,
  nameFor,
  badges,
  parentsFor = allParents,
  revealedId = null,
  onToggleReveal,
}: BreedingTreeProps) {
  const { t } = useTranslation()
  const layout = useMemo(() => computeTreeLayout(colors), [colors])
  const { state, handlers, zoomIn, zoomOut, setView } = usePanZoom({ x: 0, y: 0, scale: 1 })
  const containerRef = useRef<HTMLDivElement | null>(null)

  const fitToContainer = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const scale = Math.min(rect.width / layout.width, rect.height / layout.height) * 0.94
    setView({
      x: (rect.width - layout.width * scale) / 2,
      y: (rect.height - layout.height * scale) / 2,
      scale,
    })
  }, [layout, setView])

  useLayoutEffect(() => {
    fitToContainer()
    window.addEventListener('resize', fitToContainer)
    return () => window.removeEventListener('resize', fitToContainer)
  }, [fitToContainer])

  const edges = useMemo(() => {
    const lines: { id: string; x1: number; y1: number; x2: number; y2: number }[] = []
    for (const color of colors) {
      if (!color.crosses) continue
      const childPos = layout.positions.get(color.id)
      if (!childPos) continue
      for (const parentId of parentsFor(color)) {
        const parentPos = layout.positions.get(parentId)
        if (!parentPos) continue
        lines.push({
          id: `${parentId}->${color.id}`,
          x1: parentPos.x + NODE_WIDTH,
          y1: parentPos.y + NODE_HEIGHT / 2,
          x2: childPos.x,
          y2: childPos.y + NODE_HEIGHT / 2,
        })
      }
    }
    return lines
  }, [colors, layout, parentsFor])

  return (
    <div
      ref={containerRef}
      className="relative min-h-[420px] flex-1 overflow-hidden rounded-lg border border-(--color-border) bg-(--color-panel) md:min-h-[560px]"
    >
      <svg
        role="img"
        aria-label={t('tree.title')}
        className="h-full w-full touch-none"
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerLeave={handlers.onPointerLeave}
        onWheel={handlers.onWheel}
        onTouchStart={handlers.onTouchStart}
        onTouchMove={handlers.onTouchMove}
        onTouchEnd={handlers.onTouchEnd}
      >
        <g transform={`translate(${state.x}, ${state.y}) scale(${state.scale})`}>
          {edges.map((edge) => {
            const highlighted =
              getNodeState(edge.id.split('->')[0] ?? '') !== 'dimmed' &&
              getNodeState(edge.id.split('->')[1] ?? '') !== 'dimmed'
            return (
              <path
                key={edge.id}
                d={`M ${edge.x1} ${edge.y1} C ${edge.x1 + 40} ${edge.y1}, ${edge.x2 - 40} ${edge.y2}, ${edge.x2} ${edge.y2}`}
                fill="none"
                stroke={highlighted ? 'var(--color-accent)' : 'var(--color-border)'}
                strokeWidth={highlighted ? 1.5 : 1}
                opacity={highlighted ? 0.9 : 0.35}
              />
            )
          })}
          {colors.map((color) => {
            const position = layout.positions.get(color.id)
            if (!position) return null
            return (
              <TreeNode
                key={color.id}
                color={color}
                label={nameFor(color)}
                x={position.x}
                y={position.y}
                state={getNodeState(color.id)}
                onSelect={onSelect}
                badge={badges?.get(color.id)}
                recipeCount={color.crosses?.length}
                revealed={color.id === revealedId}
                onToggleReveal={onToggleReveal}
              />
            )
          })}
        </g>
      </svg>
      <div className="absolute right-3 bottom-3 flex gap-1">
        <button
          type="button"
          onClick={zoomOut}
          aria-label={t('tree.zoomOut')}
          className="h-8 w-8 rounded border border-(--color-border) bg-(--color-panel-raised) text-lg leading-none text-(--color-text) hover:border-(--color-accent)"
        >
          −
        </button>
        <button
          type="button"
          onClick={fitToContainer}
          aria-label={t('tree.resetView')}
          className="h-8 rounded border border-(--color-border) bg-(--color-panel-raised) px-2 text-xs text-(--color-text) hover:border-(--color-accent)"
        >
          {t('tree.resetView')}
        </button>
        <button
          type="button"
          onClick={zoomIn}
          aria-label={t('tree.zoomIn')}
          className="h-8 w-8 rounded border border-(--color-border) bg-(--color-panel-raised) text-lg leading-none text-(--color-text) hover:border-(--color-accent)"
        >
          +
        </button>
      </div>
    </div>
  )
}
