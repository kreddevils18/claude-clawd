// Turns a Frame recipe into pixels: body first, then face, then the layers on top.

import {
  ARMS,
  ARM_LEFT_X,
  ARM_RIGHT_X,
  BLUSH_RECTS,
  EYES,
  EYE_LEFT_X,
  EYE_RIGHT_X,
  LEGS,
  LEG_X,
  MOUTHS,
  MOUTH_X,
  bodyBox,
} from './body-parts.ts'
import { CANVAS_H, CANVAS_W, type Frame } from './frame.ts'
import { PALETTE } from './palette.ts'

/** -1 marks a transparent pixel; anything else is 0xRRGGBB. */
export const TRANSPARENT = -1

export type Pixels = {
  px: Int32Array
  /** How many pixels the frame tried to draw outside the canvas (and lost). */
  clipped: number
}

const GLYPH_COLUMNS = CANVAS_W
const GLYPH_ROWS = CANVAS_H / 2

export const isDrawableGlyph = (col: number, row: number, ch: string): boolean =>
  Number.isInteger(col) &&
  Number.isInteger(row) &&
  col >= 0 &&
  col < GLYPH_COLUMNS &&
  row >= 0 &&
  row < GLYPH_ROWS &&
  ch.length === 1 &&
  ch >= ' '

export const rasterize = (frame: Frame): Pixels => {
  const px = new Int32Array(CANVAS_W * CANVAS_H).fill(TRANSPARENT)
  let clipped = 0
  const put = (x: number, y: number, color: number) => {
    if (x < 0 || y < 0 || x >= CANVAS_W || y >= CANVAS_H) {
      clipped++
      return
    }
    px[y * CANVAS_W + x] = color
  }
  const fill = (x: number, y: number, w: number, h: number, color: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) put(xx, yy, color)
  }

  const { body } = frame
  const box = bodyBox(body)

  // Arms.
  const left = ARMS[body.arms.left]
  const right = ARMS[body.arms.right]
  fill(box.originX + ARM_LEFT_X - body.fat - left.ext, box.armY + left.dy, 2 + left.ext, 2, PALETTE.body)
  fill(box.originX + ARM_RIGHT_X + body.fat, box.armY + right.dy, 2 + right.ext, 2, PALETTE.body)

  // Body, flat like the logo.
  fill(box.left, box.top, box.right - box.left + 1, box.legY - box.top, PALETTE.body)

  // Legs.
  const legHeights = LEGS[body.legs]
  LEG_X.forEach((lx, i) => {
    fill(box.originX + lx, box.legY, 1, legHeights[i] ?? 2, PALETTE.body)
  })

  // Eyes are holes: the background shows through, as in the logo.
  for (const eyeX of [EYE_LEFT_X, EYE_RIGHT_X]) {
    for (const r of EYES[frame.eyes.shape]) {
      fill(box.originX + eyeX + frame.eyes.shiftX + r.dx, box.eyeY + r.dy, r.w, r.h, TRANSPARENT)
    }
  }

  // Mouth and cheeks.
  if (frame.mouth) {
    for (const r of MOUTHS[frame.mouth]) {
      fill(box.originX + MOUTH_X + r.dx, box.mouthY + r.dy, r.w, r.h, PALETTE.shade)
    }
  }
  if (frame.blush) {
    for (const c of BLUSH_RECTS) fill(box.originX + c.x, box.eyeY + 2, c.w, 1, PALETTE.blush)
  }

  // Props, hats and particles, in the order they were added.
  for (const layer of frame.layers) {
    if (layer.kind === 'rect') {
      const r = layer.rect
      fill(r.x, r.y, r.w, r.h, r.color)
    } else {
      for (const d of layer.dots) put(d.x, d.y, d.color)
    }
  }

  // Glyphs sit on the 50×8 cell grid and must be one printable BMP character (the terminal's
  // Raster refuses anything else); a misplaced or wide one counts as clipped, like a stray pixel.
  for (const g of frame.glyphs) {
    if (!isDrawableGlyph(g.col, g.row, g.ch)) clipped++
  }

  return { px, clipped }
}
