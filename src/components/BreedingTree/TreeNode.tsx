import { useTranslation } from 'react-i18next'
import type { MountColor } from '../../data'
import { NODE_HEIGHT, NODE_WIDTH } from './layout'
import { getSwatch } from './palette'

/**
 * Badge pill geometry. The pill is centred on the node's top edge and overhangs
 * its right edge, which keeps it clear of both the swatch (left edge, x 6-20)
 * and the vertically centred label (glyph top ≈ y 13) at every zoom level.
 */
const BADGE_HEIGHT = 18
const BADGE_FONT_SIZE = 11
/** Approximate advance width of one digit at {@link BADGE_FONT_SIZE}. */
const BADGE_CHAR_WIDTH = 6.5
const BADGE_PADDING_X = 12
const BADGE_MIN_WIDTH = 22
const BADGE_OVERHANG = 6

/**
 * Reveal-toggle pill geometry. It hangs in the gap *below* the node, pushed
 * right of centre: the tree runs down the page, so an edge now leaves from the
 * bottom centre and a centred pill would sit on top of it. The count badge
 * (top edge) can never reach it either — the two are mutually exclusive in
 * practice (only the planner passes badges, only the tree page passes a reveal
 * toggle) but the geometry does not rely on that.
 */
const REVEAL_HEIGHT = 16
const REVEAL_FONT_SIZE = 10
const REVEAL_CHAR_WIDTH = 6
const REVEAL_PADDING_X = 14
/** Clear of the bottom-centre edge anchor, and inside the row gap. */
const REVEAL_OFFSET_X = NODE_WIDTH * 0.42
const REVEAL_GAP_Y = 6

interface TreeNodeProps {
  color: MountColor
  label: string
  x: number
  y: number
  state: 'selected' | 'lineage' | 'dimmed' | 'idle'
  onSelect: (id: string) => void
  /** Phase 2, optional: short badge text (e.g. `"2.5"`). Absent renders no badge. */
  badge?: string
  /**
   * Phase 3, optional: how many recipes this colour has. A toggle to reveal
   * them all is drawn only when this is above 1 *and* the node is selected —
   * 21 colours have several recipes, and a permanently visible control on each
   * of them would clutter a 120-node tree.
   */
  recipeCount?: number
  /** Whether every recipe's edges are currently shown for this node. */
  revealed?: boolean
  /** Toggles {@link revealed}. Absent leaves the control unrendered. */
  onToggleReveal?: (id: string) => void
}

/**
 * Recovers the count behind a badge's display text, tolerating the French
 * decimal comma. Returns `null` when the text is not numeric, so callers can
 * avoid announcing a `NaN` count.
 */
function parseBadgeCount(badge: string): number | null {
  const parsed = Number.parseFloat(badge.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * One colour node in the breeding tree SVG: swatch, truncated label, selection
 * / lineage styling, and — when the planner supplies one — a count badge.
 */
export function TreeNode({
  color,
  label,
  x,
  y,
  state,
  onSelect,
  badge,
  recipeCount,
  revealed = false,
  onToggleReveal,
}: TreeNodeProps) {
  const { t } = useTranslation()
  const swatch = getSwatch(color.id)
  const opacity = state === 'dimmed' ? 0.28 : 1
  const strokeColor =
    state === 'selected'
      ? 'var(--color-gold)'
      : state === 'lineage'
        ? 'var(--color-accent)'
        : 'var(--color-border)'
  const strokeWidth = state === 'selected' ? 2.5 : state === 'lineage' ? 1.75 : 1

  // The badges contract carries display text only. The numeric count is read
  // back from it purely to drive i18next pluralisation ("1 nécessaire" vs
  // "2,5 nécessaires"); the badge text itself is what gets interpolated, so the
  // caller's locale-aware formatting survives into the accessible label.
  const badgeCount = badge === undefined ? null : parseBadgeCount(badge)
  const badgeWidth = badge
    ? Math.max(BADGE_MIN_WIDTH, badge.length * BADGE_CHAR_WIDTH + BADGE_PADDING_X)
    : 0
  const badgeX = NODE_WIDTH + BADGE_OVERHANG - badgeWidth

  const showReveal = state === 'selected' && onToggleReveal !== undefined && (recipeCount ?? 0) > 1
  const revealLabel = revealed
    ? t('tree.recipesHide')
    : t('tree.recipesReveal', { count: recipeCount ?? 0 })
  const revealWidth = Math.max(44, revealLabel.length * REVEAL_CHAR_WIDTH + REVEAL_PADDING_X)

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
      {badge && (
        <g>
          <title>
            {badgeCount === null
              ? badge
              : t('planner.badgeTooltip', { count: badgeCount, value: badge })}
          </title>
          <rect
            x={badgeX}
            y={-BADGE_HEIGHT / 2}
            width={badgeWidth}
            height={BADGE_HEIGHT}
            rx={BADGE_HEIGHT / 2}
            fill="var(--color-gold)"
            stroke="var(--color-panel-raised)"
            strokeWidth={1.5}
          />
          <text
            x={badgeX + badgeWidth / 2}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={BADGE_FONT_SIZE}
            fontWeight={700}
            fill="var(--color-panel-raised)"
          >
            {badge}
          </text>
        </g>
      )}
      {showReveal && (
        // biome-ignore lint/a11y/useSemanticElements: a real <button> isn't valid inside SVG <g>
        <g
          role="button"
          tabIndex={0}
          aria-pressed={revealed}
          // The node itself is clickable, so the toggle has to stop the event
          // reaching it — otherwise revealing recipes would re-select the node
          // and, on a second click, look like it did nothing.
          onClick={(event) => {
            event.stopPropagation()
            onToggleReveal?.(color.id)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.stopPropagation()
            onToggleReveal?.(color.id)
          }}
          style={{ cursor: 'pointer' }}
        >
          <title>{revealLabel}</title>
          <rect
            x={REVEAL_OFFSET_X}
            y={NODE_HEIGHT + REVEAL_GAP_Y}
            width={revealWidth}
            height={REVEAL_HEIGHT}
            rx={REVEAL_HEIGHT / 2}
            fill={revealed ? 'var(--color-accent)' : 'var(--color-panel)'}
            stroke="var(--color-accent)"
            strokeWidth={1.25}
          />
          <text
            x={REVEAL_OFFSET_X + revealWidth / 2}
            y={NODE_HEIGHT + REVEAL_GAP_Y + REVEAL_HEIGHT / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={REVEAL_FONT_SIZE}
            fontWeight={600}
            fill={revealed ? 'var(--color-panel)' : 'var(--color-accent)'}
          >
            {revealLabel}
          </text>
        </g>
      )}
    </g>
  )
}
