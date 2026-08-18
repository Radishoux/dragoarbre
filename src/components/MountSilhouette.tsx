import { useId } from 'react'
import { getColorById, type SpeciesId } from '../data'
import { getSwatch } from './BreedingTree/palette'

/**
 * Stylised mount silhouettes, one shape per species, tinted with the colour's
 * own swatch.
 *
 * **Original artwork.** Every shape below is drawn here, from SVG primitives.
 * Dragoarbre ships no Ankama assets and no ripped sprites, and does not
 * hotlink game art — the mounts pictured elsewhere on the web are Ankama's,
 * and redistributing them from a public site is not ours to do. See
 * `README.md` and `docs/DECISIONS.md`.
 *
 * These are silhouettes, not portraits: enough to tell the three species apart
 * at a glance and to carry a colour, not an attempt to draw the animal.
 */

/** A bird-legged mount: long neck, beak, fanned tail. */
function DragoturkeyShape() {
  return (
    <>
      <ellipse cx="28" cy="26" rx="16" ry="10" />
      {/* Neck sweeping up and forward, the way a long-legged bird stands */}
      <path d="M40 20 L45 9 a4 4 0 0 1 7 2 l-3 10 z" />
      <circle cx="50" cy="9" r="4.5" />
      <path d="M54 8 l8 2 -8 2 z" />
      <rect x="21" y="34" width="3.5" height="11" rx="1.5" />
      <rect x="32" y="34" width="3.5" height="11" rx="1.5" />
      <path d="M18 45 h9 v2 h-9 z" />
      <path d="M29 45 h9 v2 h-9 z" />
      {/* Fanned tail */}
      <path d="M13 22 l-11 -7 3 11 -3 11 11 -7 z" />
    </>
  )
}

/** An amphibious mount: streamlined body, flippers, broad tail fin. */
function SeemyoolShape() {
  return (
    <>
      <ellipse cx="30" cy="26" rx="18" ry="11" />
      {/* Head merged into the body rather than set on a neck */}
      <circle cx="47" cy="22" r="7" />
      <path d="M53 19 l9 3 -9 3 z" />
      {/* Flippers, swept back */}
      <path d="M23 34 c 4 7 3 10 -3 12 c -2 -6 -1 -9 3 -12 z" />
      <path d="M36 34 c 4 7 3 10 -3 12 c -2 -6 -1 -9 3 -12 z" />
      {/* Broad tail fin */}
      <path d="M13 26 l-11 -10 3 10 -3 10 z" />
    </>
  )
}

/** A horned beetle mount: domed carapace, forward horn, six short legs. */
function RhineetleShape() {
  return (
    <>
      <ellipse cx="28" cy="24" rx="18" ry="12" />
      <circle cx="46" cy="26" r="6" />
      {/* The horn the species is named for */}
      <path d="M50 22 c 5 -3 8 -3 12 -7 c -2 7 -6 9 -10 10 z" />
      {/* Three legs a side, splayed under the shell */}
      <rect x="15" y="33" width="3" height="10" rx="1.5" />
      <rect x="26" y="35" width="3" height="10" rx="1.5" />
      <rect x="37" y="33" width="3" height="10" rx="1.5" />
      <path d="M11 42 h8 v2 h-8 z" />
      <path d="M22 44 h8 v2 h-8 z" />
      <path d="M33 42 h8 v2 h-8 z" />
    </>
  )
}

const SHAPE: Record<SpeciesId, () => React.JSX.Element> = {
  dragoturkey: DragoturkeyShape,
  seemyool: SeemyoolShape,
  rhineetle: RhineetleShape,
}

/**
 * @param colorId - any colour id; its species picks the shape and its swatch
 *   the colours. An unknown id falls back to the Dragoturkey shape rather than
 *   rendering nothing.
 * @param size - width in pixels; the shape keeps a 4:3 box.
 */
export function MountSilhouette({ colorId, size = 56 }: { colorId: string; size?: number }) {
  const swatch = getSwatch(colorId)
  const species = getColorById(colorId)?.species ?? 'dragoturkey'
  const Shape = SHAPE[species]
  // Gradient ids are document-global, so two silhouettes on one screen would
  // collide without this.
  const gradientId = useId()
  const fill = swatch.kind === 'mono' ? swatch.hex : `url(#${gradientId})`

  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 64 48" aria-hidden="true" focusable="false">
      {swatch.kind === 'bicolor' && (
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            {/* Two stops at the same offset make a hard edge rather than a blend. */}
            <stop offset="50%" stopColor={swatch.hexA} />
            <stop offset="50%" stopColor={swatch.hexB} />
          </linearGradient>
        </defs>
      )}
      <g fill={fill} stroke="var(--color-border)" strokeWidth={0.75}>
        <Shape />
      </g>
    </svg>
  )
}
