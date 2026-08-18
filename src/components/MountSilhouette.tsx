import { useId } from 'react'
import { getSwatch } from './BreedingTree/palette'

/**
 * A stylised mount silhouette, tinted with the colour's own swatch.
 *
 * **Original artwork.** The shape below is drawn here, from scratch, as a few
 * SVG primitives. Dragoarbre ships no Ankama assets and no ripped sprites, and
 * does not hotlink game art from anywhere else — the mounts pictured elsewhere
 * on the web are Ankama's, and redistributing them from a public site is not
 * ours to do. See `README.md` and `docs/DECISIONS.md`.
 *
 * One shape serves all three species: it reads as "a mount" rather than as a
 * Dragoturkey specifically, which is honest about what it is — a colour
 * swatch with a body, not a portrait of the animal.
 *
 * A monocolor fills flat. A bicolor splits hard down the middle, the same way
 * its node swatch does, so the two readings agree.
 */
export function MountSilhouette({ colorId, size = 56 }: { colorId: string; size?: number }) {
  const swatch = getSwatch(colorId)
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
        {/* Body */}
        <ellipse cx="30" cy="26" rx="17" ry="10" />
        {/* Neck and head, leaning forward the way a bird-legged mount stands */}
        <path d="M42 20 L47 9 a4 4 0 0 1 7 2 l-3 10 z" />
        <circle cx="52" cy="9" r="4.5" />
        {/* Beak */}
        <path d="M56 8 l6 2 -6 2 z" />
        {/* Legs */}
        <rect x="22" y="34" width="3.5" height="11" rx="1.5" />
        <rect x="34" y="34" width="3.5" height="11" rx="1.5" />
        {/* Feet */}
        <path d="M19 45 h9 v2 h-9 z" />
        <path d="M31 45 h9 v2 h-9 z" />
        {/* Tail */}
        <path d="M13 22 l-11 -7 3 11 -3 11 11 -7 z" />
      </g>
    </svg>
  )
}
