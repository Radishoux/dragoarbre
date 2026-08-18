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
      // Union across recipes: a parent shared by two recipes of the same
      // child would otherwise draw the identical line twice, and duplicate
      // React keys with it.
      for (const parentId of new Set(color.crosses.flat())) {
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
  }, [colors, layout])

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
