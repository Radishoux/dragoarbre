import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { MountColor } from '../../data'
import { COLUMN_WIDTH, computeTreeLayout, MAX_PER_ROW, NODE_HEIGHT, NODE_WIDTH } from './layout'
import { TreeNode } from './TreeNode'
import { usePanZoom } from './usePanZoom'

export type NodeState = 'selected' | 'lineage' | 'dimmed' | 'idle'

/**
 * Floor for the opening zoom. A node's label is 12px, so this keeps it above
 * 10 CSS pixels — below that the tree is a diagram of nothing. Fitting a
 * 19-colour generation into a laptop pane would need about 0.24.
 */
const MIN_READABLE_SCALE = 0.85
/**
 * How far below {@link MIN_READABLE_SCALE} the opening view may go *if* that
 * is what makes the whole width fit. Fitting beats the extra pixel of label:
 * a tree you can see all of is worth more than one you must pan to read. Below
 * this it stops being worth it, and the view stays readable and scrolls.
 */
const MIN_FIT_SCALE = 0.7
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  // How many colours fit side by side at a legible zoom, measured rather than
  // guessed from a breakpoint: the tree's usable width is what actually
  // decides this, and it is not the viewport width on any screen with a panel
  // beside it. Starts at the default so the first paint is never empty.
  const [perRow, setPerRow] = useState(MAX_PER_ROW)
  const layout = useMemo(() => computeTreeLayout(colors, perRow), [colors, perRow])
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
    // tree into view. Fitting both axes lands around 22% zoom on a full tree,
    // where no label is readable. Since the wheel now scrolls, the useful
    // starting point is generation 1 at a legible size with the rest below —
    // the way a document opens.
    //
    // When the width very nearly fits, though, fitting wins: flooring at the
    // readable scale used to push a mobile tree 19px over its own container,
    // so it opened needing a horizontal pan to see two columns.
    const widthFit = (rect.width / layout.width) * 0.98
    const scale =
      widthFit >= MIN_FIT_SCALE ? Math.min(1, widthFit) : Math.min(1, MIN_READABLE_SCALE)
    setView({
      x: (rect.width - layout.width * scale) / 2,
      y: TOP_MARGIN,
      scale,
    })
  }, [layout, setView])

  /** Reads the container and re-derives the row cap and the opening view. */
  const measure = useCallback(() => {
    const width = containerRef.current?.getBoundingClientRect().width ?? 0
    // A 0-width read means layout has not settled; leave the cap alone and wait
    // for the next trigger rather than pinning the tree to one colour per row.
    if (width === 0) return
    const fits = Math.floor(width / (COLUMN_WIDTH * MIN_READABLE_SCALE))
    setPerRow(Math.min(MAX_PER_ROW, Math.max(1, fits)))
    fitToContainer()
  }, [fitToContainer])

  // Three triggers, because no one of them is reliable on its own. The
  // immediate read races the flex layout it depends on and can see 0; the
  // animation frame catches the settled box; the observer catches later changes
  // such as the detail panel appearing beside the tree. `measure` is idempotent,
  // so running it more than once costs nothing.
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    measure()
    const frame = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure())
    observer?.observe(container)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [measure])

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
        // `absolute inset-0` rather than `h-full`: the container sets only
        // `min-height`, so its `height` stays `auto` and a percentage height
        // never resolves — the SVG fell back to the CSS default replaced-element
        // box, 300x150, and showed six colours on a phone.
        className="absolute inset-0 h-full w-full touch-none"
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
          className="h-11 w-11 rounded border border-(--color-border) bg-(--color-panel-raised) text-lg leading-none text-(--color-text) hover:border-(--color-accent) md:h-8 md:w-8"
        >
          −
        </button>
        <button
          type="button"
          onClick={fitToContainer}
          aria-label={t('tree.resetView')}
          className="h-11 rounded border border-(--color-border) bg-(--color-panel-raised) px-3 text-xs text-(--color-text) hover:border-(--color-accent) md:h-8 md:px-2"
        >
          {t('tree.resetView')}
        </button>
        <button
          type="button"
          onClick={zoomIn}
          aria-label={t('tree.zoomIn')}
          className="h-11 w-11 rounded border border-(--color-border) bg-(--color-panel-raised) text-lg leading-none text-(--color-text) hover:border-(--color-accent) md:h-8 md:w-8"
        >
          +
        </button>
      </div>
    </div>
  )
}
