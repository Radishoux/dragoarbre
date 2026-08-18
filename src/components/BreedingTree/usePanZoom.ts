import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

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

/** A point in the element's own pixel space, which the transform shares. */
interface Anchor {
  x: number
  y: number
}

/**
 * Minimal pan/zoom controller for the tree SVG: pointer-drag panning
 * (mouse and single-finger touch, via the unified Pointer Events API),
 * wheel *panning*, modifier-wheel and pinch zoom, and explicit zoom buttons.
 *
 * The wheel scrolls rather than zooms. Zoom-on-wheel is the surprising binding
 * on a page you also scroll: the tree runs top to bottom and reads that way, so
 * the wheel does what it does everywhere else and walks you down the
 * generations. Zoom is on Ctrl or Shift, matching the convention browsers and
 * map UIs already use, and on the buttons for anyone who would rather not hold
 * a key at all.
 *
 * **Zoom is anchored.** `translate(x, y) scale(s)` scales about the transform
 * origin, so changing `s` on its own slides every point toward or away from
 * that origin and the tree visibly drifts sideways. Each zoom therefore moves
 * `x`/`y` by the scale ratio, holding one point still on screen: the cursor for
 * a wheel zoom, the pinch midpoint for a pinch, the viewport centre for the
 * buttons.
 *
 * @param elementRef - the element the transform renders into. Used only to find
 *   its centre and to convert client coordinates into its own space; zoom falls
 *   back to unanchored if it is not attached yet.
 */
export function usePanZoom(initial: PanZoomState, elementRef: RefObject<Element | null>) {
  const [state, setState] = useState<PanZoomState>(initial)
  const dragOrigin = useRef<{ x: number; y: number; stateX: number; stateY: number } | null>(null)
  const pinchOrigin = useRef<{ distance: number; scale: number } | null>(null)

  // Mirrors `state` so pointer handlers can read the latest values directly. A
  // setState updater must be pure and may run twice in development, so it can
  // never double as a getter.
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  }, [state])

  /** Client coordinates to element-local, which is the transform's own space. */
  const toLocal = useCallback(
    (clientX: number, clientY: number): Anchor | null => {
      const rect = elementRef.current?.getBoundingClientRect()
      return rect ? { x: clientX - rect.left, y: clientY - rect.top } : null
    },
    [elementRef],
  )

  const centre = useCallback((): Anchor | null => {
    const rect = elementRef.current?.getBoundingClientRect()
    return rect ? { x: rect.width / 2, y: rect.height / 2 } : null
  }, [elementRef])

  /**
   * Applies a new scale while keeping `anchor` pinned to the same screen point.
   *
   * A point renders at `x + world * scale`. To hold it still while the scale
   * changes by `ratio`, the translation absorbs the difference:
   * `x' = anchor - (anchor - x) * ratio`.
   */
  const zoomTo = useCallback((nextScale: (from: number) => number, anchor: Anchor | null) => {
    setState((current) => {
      const scale = clampScale(nextScale(current.scale))
      if (scale === current.scale) return current
      if (!anchor) return { ...current, scale }
      const ratio = scale / current.scale
      return {
        scale,
        x: anchor.x - (anchor.x - current.x) * ratio,
        y: anchor.y - (anchor.y - current.y) * ratio,
      }
    })
  }, [])

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    dragOrigin.current = {
      x: event.clientX,
      y: event.clientY,
      stateX: stateRef.current.x,
      stateY: stateRef.current.y,
    }
    ;(event.target as Element).setPointerCapture(event.pointerId)
  }, [])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    // Read the origin into a local before the updater closes over it. The
    // updater runs after this handler returns, by which time a pointerup may
    // already have cleared the ref — dereferencing it in there is what crashed
    // the tree mid-drag.
    const origin = dragOrigin.current
    if (!origin) return
    const dx = event.clientX - origin.x
    const dy = event.clientY - origin.y
    setState((current) => ({ ...current, x: origin.stateX + dx, y: origin.stateY + dy }))
  }, [])

  const onPointerUp = useCallback(() => {
    dragOrigin.current = null
  }, [])

  /**
   * Native handler, not a React prop: React registers wheel and touchmove as
   * *passive* listeners, where `preventDefault()` is ignored with a console
   * error. Panning has to stop the page scrolling underneath the tree, so
   * `BreedingTree` attaches this with `{ passive: false }`.
   */
  const onWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault()

      // Ctrl is also what a trackpad pinch reports, so this covers both.
      if (event.ctrlKey || event.shiftKey || event.metaKey) {
        zoomTo(
          (from) => from - event.deltaY * ZOOM_PER_WHEEL_UNIT,
          toLocal(event.clientX, event.clientY),
        )
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
    },
    [zoomTo, toLocal],
  )

  const onTouchStart = useCallback((event: React.TouchEvent) => {
    if (event.touches.length !== 2) return
    const a = event.touches[0]
    const b = event.touches[1]
    if (!a || !b) return
    pinchOrigin.current = {
      distance: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
      scale: stateRef.current.scale,
    }
  }, [])

  /** Native for the same reason as {@link onWheel} — pinch must not zoom the page. */
  const onTouchMove = useCallback(
    (event: TouchEvent) => {
      const origin = pinchOrigin.current
      if (event.touches.length !== 2 || !origin) return
      event.preventDefault()
      const a = event.touches[0]
      const b = event.touches[1]
      if (!a || !b) return
      const distance = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY)
      const midpoint = toLocal((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2)
      zoomTo(() => origin.scale * (distance / origin.distance), midpoint)
    },
    [zoomTo, toLocal],
  )

  const onTouchEnd = useCallback(() => {
    pinchOrigin.current = null
  }, [])

  const zoomBy = useCallback(
    (delta: number) => zoomTo((from) => from + delta, centre()),
    [zoomTo, centre],
  )

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
