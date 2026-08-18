import type { MountColor } from '../../data'

export const COLUMN_WIDTH = 190
export const ROW_HEIGHT = 68
export const NODE_WIDTH = 152
export const NODE_HEIGHT = 44
const PADDING = 40

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
 * Pure generation-by-generation layout: one column per generation, nodes
 * stacked top to bottom in each column, all columns vertically centered
 * against the tallest one.
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
  // A column's x is `(generation - 1) * COLUMN_WIDTH`, so the rightmost column
  // is fixed by the HIGHEST generation present, not by how many generations
  // there are. Counting columns would under-size the canvas — and clip the
  // tree — whenever the set is sparse, as it is for a filtered ancestry.
  // For the full 1..10 tree the two agree (count 10 = max 10).
  const maxGeneration = generations.reduce((max, generation) => Math.max(max, generation), 0)
  // Seeded with 0 because `Math.max()` over an empty list is -Infinity, which
  // would poison the canvas height when there is nothing to lay out at all.
  const maxCount = Math.max(0, ...[...byGeneration.values()].map((bucket) => bucket.length))
  const contentHeight = maxCount * ROW_HEIGHT

  const positions = new Map<string, NodePosition>()
  for (const generation of generations) {
    const bucket = byGeneration.get(generation) ?? []
    const columnHeight = bucket.length * ROW_HEIGHT
    const yOffset = PADDING + (contentHeight - columnHeight) / 2
    bucket.forEach((color, index) => {
      positions.set(color.id, {
        x: PADDING + (generation - 1) * COLUMN_WIDTH,
        y: yOffset + index * ROW_HEIGHT,
      })
    })
  }

  return {
    positions,
    width: PADDING * 2 + maxGeneration * COLUMN_WIDTH,
    height: PADDING * 2 + contentHeight,
  }
}
