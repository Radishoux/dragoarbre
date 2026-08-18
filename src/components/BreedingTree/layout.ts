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
 */
export function computeTreeLayout(colors: readonly MountColor[]): TreeLayout {
  const byGeneration = new Map<number, MountColor[]>()
  for (const color of colors) {
    const bucket = byGeneration.get(color.generation) ?? []
    bucket.push(color)
    byGeneration.set(color.generation, bucket)
  }

  const generations = [...byGeneration.keys()].sort((a, b) => a - b)
  const maxCount = Math.max(...[...byGeneration.values()].map((bucket) => bucket.length))
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
    width: PADDING * 2 + generations.length * COLUMN_WIDTH,
    height: PADDING * 2 + contentHeight,
  }
}
