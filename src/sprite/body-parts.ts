// Body geometry and the offset tables for eyes, mouths, arms and legs.
//
// Clawd is the 18×6 logo. In a terminal one logo pixel is half a cell wide and half a cell
// tall, so it is twice as tall as it is wide. On our square-pixel canvas each logo pixel is
// therefore 1 wide × 2 tall: the body is 12×8, the arms 2×2, the legs 1×2 and each eye a
// 1×2 hole, exactly as the logo is drawn.

import type { ArmPose, BodyOptions, EyeShape, LegPose, MouthShape } from './frame.ts'

/** Where the resting body's top-left corner sits on the canvas. */
const ORIGIN_X = 16
const ORIGIN_Y = 5

/** Body columns (offsets from the origin, inclusive) and rows. */
export const BODY_FROM = 3
export const BODY_TO = 14
const BODY_ROWS = 8

export type CarveRect = { dx: number; dy: number; w: number; h: number }

/**
 * Eyes are holes cut through the body (the background shows through), as in the logo.
 * Offsets are from the eye's anchor: the open eye's top-left pixel.
 */
export const EYES: Readonly<Record<EyeShape, readonly CarveRect[]>> = Object.freeze({
  open: [{ dx: 0, dy: 0, w: 1, h: 2 }],
  down: [{ dx: 0, dy: 1, w: 1, h: 2 }],
  up: [{ dx: 0, dy: -1, w: 1, h: 2 }],
  closed: [{ dx: -1, dy: 1, w: 3, h: 1 }],
  happy: [
    { dx: 0, dy: 0, w: 1, h: 1 },
    { dx: -1, dy: 1, w: 1, h: 1 },
    { dx: 1, dy: 1, w: 1, h: 1 },
  ],
  wide: [{ dx: 0, dy: -1, w: 1, h: 4 }],
  x: [
    { dx: -1, dy: 0, w: 1, h: 1 },
    { dx: 1, dy: 0, w: 1, h: 1 },
    { dx: 0, dy: 1, w: 1, h: 1 },
    { dx: -1, dy: 2, w: 1, h: 1 },
    { dx: 1, dy: 2, w: 1, h: 1 },
  ],
  tired: [
    { dx: -1, dy: 1, w: 3, h: 1 },
    { dx: 0, dy: 2, w: 1, h: 1 },
  ],
})

/** Left and right eye anchors, relative to the body origin; the row is from the body's top. */
export const EYE_LEFT_X = 5
export const EYE_RIGHT_X = 12
const EYE_ROW = 2
export const MOUTH_X = 7
const MOUTH_ROW = 5

export const MOUTHS: Readonly<Record<MouthShape, readonly CarveRect[]>> = Object.freeze({
  smile: [
    { dx: 0, dy: 0, w: 1, h: 1 },
    { dx: 1, dy: 1, w: 2, h: 1 },
    { dx: 3, dy: 0, w: 1, h: 1 },
  ],
  o: [{ dx: 1, dy: 0, w: 2, h: 2 }],
  sad: [
    { dx: 1, dy: 0, w: 2, h: 1 },
    { dx: 0, dy: 1, w: 1, h: 1 },
    { dx: 3, dy: 1, w: 1, h: 1 },
  ],
  flat: [{ dx: 0, dy: 1, w: 4, h: 1 }],
})

/** Cheeks, relative to the body origin: two pixels under each eye. */
export const BLUSH_RECTS: readonly { x: number; w: number }[] = [
  { x: 4, w: 2 },
  { x: 11, w: 2 },
]

export const ARMS: Readonly<Record<ArmPose, { dy: number; ext: number }>> = Object.freeze({
  side: { dy: 0, ext: 0 },
  up: { dy: -4, ext: 0 },
  half: { dy: -2, ext: 0 },
  down: { dy: 2, ext: 0 },
  wide: { dy: 0, ext: 2 },
})

/** Left arm starts at this offset (2 wide); the right arm at ARM_RIGHT_X. */
export const ARM_LEFT_X = 1
export const ARM_RIGHT_X = 15

/** Each leg: x offset from the body origin (1 wide), and its height per pose. */
export const LEG_X: readonly number[] = [4, 6, 11, 13]
export const LEGS: Readonly<Record<LegPose, readonly number[]>> = Object.freeze({
  stand: [2, 2, 2, 2],
  a: [2, 1, 2, 1],
  b: [1, 2, 1, 2],
  jump: [1, 1, 1, 1],
})

export type BodyBox = {
  /** Top row of the head: hats rest here. */
  top: number
  /** First row of the body proper (below any extra top row). */
  bodyTop: number
  left: number
  right: number
  bottom: number
  /** x of the vertical centerline, a pixel edge: a 12-wide hat starts at centerX - 6. */
  centerX: number
  eyeY: number
  mouthY: number
  armY: number
  legY: number
  originX: number
}

/** Fat adds one row at the bottom, and for fat 2 one row at the top as well; it widens each side by `fat`. */
export const bodyBox = (body: BodyOptions): BodyBox => {
  const topExtra = body.fat === 2 ? 1 : 0
  const bottomExtra = body.fat >= 1 ? 1 : 0
  const originX = ORIGIN_X + body.dx
  const top = ORIGIN_Y + body.dy - topExtra
  const bodyTop = top + topExtra
  return {
    top,
    bodyTop,
    left: originX + BODY_FROM - body.fat,
    right: originX + BODY_TO + body.fat,
    bottom: bodyTop + BODY_ROWS + bottomExtra + 1,
    centerX: originX + (BODY_FROM + BODY_TO + 1) / 2,
    eyeY: bodyTop + EYE_ROW,
    mouthY: bodyTop + MOUTH_ROW,
    armY: bodyTop + 4,
    legY: bodyTop + BODY_ROWS + bottomExtra,
    originX,
  }
}
