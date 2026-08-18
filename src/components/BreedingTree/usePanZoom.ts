import { useCallback, useRef, useState } from 'react'

export interface PanZoomState {
  x: number
  y: number
  scale: number
}

const MIN_SCALE = 0.4
const MAX_SCALE = 2.5
/** Scale change per wheel unit when a modifier turns the wheel into zoom. */
const ZOOM_PER_WHEEL_UNIT = 0.001

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

/**
 * Minimal pan/zoom controller for the tree SVG: pointer-drag panning
 * (mouse and single-finger touch, via the unified Pointer Events API),
 * wheel *panning*, modifier-wheel and pinch zoom, and explicit zoom buttons.
 *
 * The wheel scrolls rather than zooms. Zoom-on-wheel is the surprising binding
 * on a page you also scroll: the tree is now taller than it is wide and reads
 * top to bottom, so the wheel does what it does everywhere else and walks you
 * down the generations. Zoom is on Ctrl or Shift, matching the convention
 * browsers and map UIs already use, and on the buttons for anyone who would
 * rather not hold a key at all.
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

  /**
   * Native handler, not a React prop: React registers wheel and touchmove as
   * *passive* listeners, where `preventDefault()` is ignored with a console
   * error. Panning has to stop the page scrolling underneath the tree, so
   * {@link BreedingTree} attaches this with `{ passive: false }`.
   */
  const onWheel = useCallback((event: WheelEvent) => {
    event.preventDefault()

    // Ctrl is also what a trackpad pinch reports, so this covers both.
    if (event.ctrlKey || event.shiftKey || event.metaKey) {
      const delta = -event.deltaY * ZOOM_PER_WHEEL_UNIT
      setState((current) => ({ ...current, scale: clampScale(current.scale + delta) }))
      return
    }

    // Panning moves the canvas opposite the wheel, so content follows the
    // gesture. `deltaX` is what a trackpad's horizontal swipe reports and is
    // simply 0 on a plain mouse wheel.
    setState((current) => ({
      ...current,
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }))
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

  /** Native for the same reason as {@link onWheel} — pinch must not zoom the page. */
  const onTouchMove = useCallback((event: TouchEvent) => {
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
    /** Spread onto the SVG as React props. */
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave: onPointerUp,
      onTouchStart,
      onTouchEnd,
    },
    /** Attach these with `addEventListener(..., { passive: false })`. */
    nativeHandlers: { onWheel, onTouchMove },
    zoomIn: () => zoomBy(0.2),
    zoomOut: () => zoomBy(-0.2),
    /** Sets the view directly, bypassing zoom clamping — used to fit the tree to its container. */
    setView: setState,
  }
}
