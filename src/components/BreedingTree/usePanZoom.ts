import { useCallback, useRef, useState } from 'react'

export interface PanZoomState {
  x: number
  y: number
  scale: number
}

const MIN_SCALE = 0.4
const MAX_SCALE = 2.5

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/**
 * Minimal pan/zoom controller for the tree SVG: pointer-drag panning
 * (mouse and single-finger touch, via the unified Pointer Events API),
 * wheel zoom, two-finger pinch zoom, and explicit zoom buttons.
 */
export function usePanZoom(initial: PanZoomState) {
  const [state, setState] = useState<PanZoomState>(initial)
  const dragOrigin = useRef<{ x: number; y: number; stateX: number; stateY: number } | null>(null)
  const pinchOrigin = useRef<{ distance: number; scale: number } | null>(null)

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    dragOrigin.current = { x: event.clientX, y: event.clientY, stateX: 0, stateY: 0 }
    setState((current) => {
      dragOrigin.current = {
        x: event.clientX,
        y: event.clientY,
        stateX: current.x,
        stateY: current.y,
      }
      return current
    })
    ;(event.target as Element).setPointerCapture(event.pointerId)
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!dragOrigin.current) return
    const dx = event.clientX - dragOrigin.current.x
    const dy = event.clientY - dragOrigin.current.y
    setState((current) => ({
      ...current,
      x: dragOrigin.current!.stateX + dx,
      y: dragOrigin.current!.stateY + dy,
    }))
  }, [])

  const onPointerUp = useCallback(() => {
    dragOrigin.current = null
  }, [])

  const onWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault()
    const delta = -event.deltaY * 0.001
    setState((current) => ({ ...current, scale: clampScale(current.scale + delta) }))
  }, [])

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length !== 2) return
    const a = event.touches[0]!
    const b = event.touches[1]!
    const distance = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
    setState((current) => {
      pinchOrigin.current = { distance, scale: current.scale }
      return current
    })
  }, [])

  const onTouchMove = useCallback((event: React.TouchEvent) => {
    if (event.touches.length !== 2 || !pinchOrigin.current) return
    event.preventDefault()
    const a = event.touches[0]!
    const b = event.touches[1]!
    const distance = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
    const ratio = distance / pinchOrigin.current.distance
    setState((current) => ({
      ...current,
      scale: clampScale(pinchOrigin.current!.scale * ratio),
    }))
  }, [])

  const onTouchEnd = useCallback(() => {
    pinchOrigin.current = null
  }, [])

  const zoomBy = useCallback((delta: number) => {
    setState((current) => ({ ...current, scale: clampScale(current.scale + delta) }))
  }, [])

  return {
    state,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave: onPointerUp,
      onWheel,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    zoomIn: () => zoomBy(0.2),
    zoomOut: () => zoomBy(-0.2),
    /** Sets the view directly, bypassing zoom clamping — used to fit the tree to its container. */
    setView: setState,
  }
}
