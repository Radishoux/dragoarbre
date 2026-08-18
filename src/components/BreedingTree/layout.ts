import type { MountColor } from '../../data'

/** Horizontal distance between two siblings of the same generation. */
export const COLUMN_WIDTH = 172
/**
 * Vertical distance between one generation and the next.
 *
 * Generous relative to {@link NODE_HEIGHT} because the edges now run down the
 * page: the gap is what the curve needs to read as a connection rather than a
 * smear, and it is where the selected node's reveal toggle sits.
 */
export const ROW_HEIGHT = 118
export const NODE_WIDTH = 152
export const NODE_HEIGHT = 44
const PADDING = 40

/**
 * Most colours placed side by side before a generation wraps onto another row.
 *
 * Without a cap the widest generation sets the canvas width, and the two new
 * species have a 50-colour generation — 8660px, about eleven screens, on the
 * one axis the wheel does not scroll. Twelve keeps the canvas near 2000px, so
 * the tree stays a column you scroll down rather than a strip you drag across.
 */
export const MAX_PER_ROW = 12
/** Vertical gap between two sub-rows of the same generation. */
const SUB_ROW_HEIGHT = 74

export interface NodePosition {
  x: number
  y: number
}

export interface TreeLayout {
  positions: ReadonlyMap<string, NodePosition>
  width: number
  height: number
}

/**
 * Pure generation-by-generation layout: one **row** per generation, generation
 * 1 at the top, siblings spread left to right within their row and each row
 * horizontally centred against the widest one.
 *
 * Runs down the page rather than across it because that is the direction the
 * tree is read and scrolled: generation 1 is where a plan starts, and the
 * wheel walks you forward through the generations. It also matches the shape
 * of the data — 10 generations deep against up to 19 colours wide.
 *
 * The generation set may be sparse — the planner lays out only a target's
 * ancestry, which can skip generations entirely (e.g. 1, 2, 4, 6) — so nothing
 * here assumes generations start at 1 or are contiguous.
 *
 * @param colors - the colours to place; an empty list yields an empty canvas.
 * @returns absolute node positions plus the SVG canvas size that contains them.
 */
export function computeTreeLayout(colors: readonly MountColor[]): TreeLayout {
  const byGeneration = new Map<number, MountColor[]>()
  for (const color of colors) {
    const bucket = byGeneration.get(color.generation) ?? []
    bucket.push(color)
    byGeneration.set(color.generation, bucket)
  }

  const generations = [...byGeneration.keys()].sort((a, b) => a - b)
  // Seeded with 0 because `Math.max()` over an empty list is -Infinity, which
  // would poison the canvas width when there is nothing to lay out at all.
  const widest = Math.max(
    0,
    ...[...byGeneration.values()].map((bucket) => Math.min(bucket.length, MAX_PER_ROW)),
  )
  const contentWidth = widest * COLUMN_WIDTH

  // The y cursor accumulates rather than being derived from the generation
  // number, because a generation no longer occupies a fixed height: a wrapped
  // one is several sub-rows tall and has to push everything below it down. It
  // also means a sparse set — the planner lays out only a target's ancestry,
  // which can skip generations entirely — closes up instead of leaving a band
  // of empty canvas where the missing generations would have been.
  const positions = new Map<string, NodePosition>()
  let cursor = PADDING

  for (const generation of generations) {
    const bucket = byGeneration.get(generation) ?? []
    bucket.forEach((color, index) => {
      const subRow = Math.floor(index / MAX_PER_ROW)
      const column = index % MAX_PER_ROW
      // Each sub-row is centred on its own width, so a generation's last,
      // partly-filled row sits under the middle of the ones above it.
      const inRow = Math.min(bucket.length - subRow * MAX_PER_ROW, MAX_PER_ROW)
      const xOffset = PADDING + (contentWidth - inRow * COLUMN_WIDTH) / 2
      positions.set(color.id, {
        x: xOffset + column * COLUMN_WIDTH,
        y: cursor + subRow * SUB_ROW_HEIGHT,
      })
    })
    const subRows = Math.max(1, Math.ceil(bucket.length / MAX_PER_ROW))
    cursor += (subRows - 1) * SUB_ROW_HEIGHT + ROW_HEIGHT
  }

  return {
    positions,
    width: PADDING * 2 + contentWidth,
    // `cursor` has advanced past the last generation by a full ROW_HEIGHT,
    // which covers the node plus the gap that would precede a next generation;
    // trim that gap back to just the node.
    height: cursor - ROW_HEIGHT + NODE_HEIGHT + PADDING,
  }
}
