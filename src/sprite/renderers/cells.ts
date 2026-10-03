// Shared by the full-size renderers: pack the 50×16 pixels into 50×8 half-block cells.

import { CANVAS_H, CANVAS_W, type Frame } from '../frame.ts'
import { isDrawableGlyph, rasterize, TRANSPARENT } from '../rasterize.ts'
import type { Theme } from './renderer.ts'

export const COLUMNS = CANVAS_W
export const ROWS = CANVAS_H / 2

/** The terminal's own background, in the Raster color encoding. */
export const DEFAULT_COLOR = 0x01000000

export type Cell = { ch: string; fg: number; bg: number }

export const frameToCells = (frame: Frame, theme: Theme): Cell[] => {
  const { px } = rasterize(frame)
  const backdrop = theme.background === 'default' ? DEFAULT_COLOR : theme.background
  const overlay = new Map(
    frame.glyphs.filter(g => isDrawableGlyph(g.col, g.row, g.ch)).map(g => [g.row * COLUMNS + g.col, g]),
  )
  const cells: Cell[] = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const top = px[row * 2 * CANVAS_W + col] as number
      const bottom = px[(row * 2 + 1) * CANVAS_W + col] as number
      const glyph = overlay.get(row * COLUMNS + col)
      if (glyph) {
        const under = top !== TRANSPARENT ? top : bottom !== TRANSPARENT ? bottom : backdrop
        cells.push({ ch: glyph.ch, fg: glyph.color, bg: under })
      } else if (top === TRANSPARENT && bottom === TRANSPARENT) {
        cells.push({ ch: ' ', fg: DEFAULT_COLOR, bg: backdrop })
      } else if (bottom === TRANSPARENT) {
        cells.push({ ch: '▀', fg: top, bg: backdrop })
      } else if (top === TRANSPARENT) {
        cells.push({ ch: '▄', fg: bottom, bg: backdrop })
      } else {
        cells.push({ ch: '▀', fg: top, bg: bottom })
      }
    }
  }
  return cells
}
