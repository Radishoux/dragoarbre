import type { MountColor } from '../../data'
import { NODE_HEIGHT, NODE_WIDTH } from './layout'
import { getSwatch } from './palette'

interface TreeNodeProps {
  color: MountColor
  label: string
  x: number
  y: number
  state: 'selected' | 'lineage' | 'dimmed' | 'idle'
  onSelect: (id: string) => void
}

export function TreeNode({ color, label, x, y, state, onSelect }: TreeNodeProps) {
  const swatch = getSwatch(color.id)
  const opacity = state === 'dimmed' ? 0.28 : 1
  const strokeColor =
    state === 'selected'
      ? 'var(--color-gold)'
      : state === 'lineage'
        ? 'var(--color-accent)'
        : 'var(--color-border)'
  const strokeWidth = state === 'selected' ? 2.5 : state === 'lineage' ? 1.75 : 1

  return (
    // biome-ignore lint/a11y/useSemanticElements: a real <button> isn't valid inside SVG <g>
    <g
      transform={`translate(${x}, ${y})`}
      opacity={opacity}
      onClick={() => onSelect(color.id)}
      role="button"
      tabIndex={0}
      aria-pressed={state === 'selected'}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onSelect(color.id)
      }}
      style={{ cursor: 'pointer' }}
    >
      <rect
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={8}
        fill="var(--color-panel-raised)"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {swatch.kind === 'mono' ? (
        <rect x={6} y={6} width={14} height={NODE_HEIGHT - 12} rx={3} fill={swatch.hex} />
      ) : (
        <>
          <rect x={6} y={6} width={7} height={NODE_HEIGHT - 12} rx={2} fill={swatch.hexA} />
          <rect x={13} y={6} width={7} height={NODE_HEIGHT - 12} rx={2} fill={swatch.hexB} />
        </>
      )}
      <text
        x={28}
        y={NODE_HEIGHT / 2}
        dominantBaseline="middle"
        fontSize={12}
        fill="var(--color-text)"
      >
        <title>{label}</title>
        {label.length > 16 ? `${label.slice(0, 15)}…` : label}
      </text>
    </g>
  )
}
