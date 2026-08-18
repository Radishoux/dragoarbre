import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { MountColor } from '../../data'
import { computeTreeLayout, NODE_HEIGHT, NODE_WIDTH } from './layout'
import { TreeNode } from './TreeNode'
import { usePanZoom } from './usePanZoom'

export type NodeState = 'selected' | 'lineage' | 'dimmed' | 'idle'

/**
 * Floor for the opening zoom. A node's label is 12px, so this keeps it above
 * 10 CSS pixels — below that the tree is a diagram of nothing. Fitting a
 * 19-colour generation into a laptop pane would need about 0.24.
 */
const MIN_READABLE_SCALE = 0.85
/** Gap above generation 1 when the view opens or is reset. */
const TOP_MARGIN = 12

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
 * The pan/zoom breeding-tree SVG: one row per generation running down the page,
 * cubic edges along each `crosses` edge, and one {@link TreeNode} per colour.
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  // The SVG is what zoom anchors against: its box is the viewport the tree is
  // seen through, and its pixel space is the transform's own.
  const { state, handlers, nativeHandlers, zoomIn, zoomOut, setView } = usePanZoom(
    { x: 0, y: 0, scale: 1 },
    svgRef,
  )

  // Wheel and touchmove are registered by hand because React registers both as
  // passive, where the `preventDefault()` that stops the page scrolling behind
  // the tree is ignored.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const { onWheel, onTouchMove } = nativeHandlers
    svg.addEventListener('wheel', onWheel, { passive: false })
    svg.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('touchmove', onTouchMove)
    }
  }, [nativeHandlers])

  const fitToContainer = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    // Fit the *width*, anchored at the top, rather than squeezing the whole
    // tree into view. A generation-10 row is 19 colours wide, so fitting both
    // axes lands around 22% zoom, where no label is readable. Since the wheel
    // now scrolls, the useful starting point is generation 1 at a legible size
    // with the rest of the tree below you — the way a document opens.
    const scale = Math.min(1, Math.max(MIN_READABLE_SCALE, (rect.width / layout.width) * 0.98))
    setView({
      x: (rect.width - layout.width * scale) / 2,
      y: TOP_MARGIN,
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
        // Bottom edge of the parent to top edge of the child: the tree runs
        // down the page, so an edge leaves a node's underside.
        lines.push({
          id: `${parentId}->${color.id}`,
          x1: parentPos.x + NODE_WIDTH / 2,
          y1: parentPos.y + NODE_HEIGHT,
          x2: childPos.x + NODE_WIDTH / 2,
          y2: childPos.y,
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
        ref={svgRef}
        role="img"
        aria-label={t('tree.title')}
        className="h-full w-full touch-none"
        onPointerDown={handlers.onPointerDown}
        onPointerMove={handlers.onPointerMove}
        onPointerUp={handlers.onPointerUp}
        onPointerLeave={handlers.onPointerLeave}
        onTouchStart={handlers.onTouchStart}
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
                d={`M ${edge.x1} ${edge.y1} C ${edge.x1} ${edge.y1 + 42}, ${edge.x2} ${edge.y2 - 42}, ${edge.x2} ${edge.y2}`}
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
