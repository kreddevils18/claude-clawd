// For surfaces with an Svg element (desktop, editor, mobile): the frame as crisp vector pixels,
// so nothing depends on how a font draws block characters.

import type { Frame } from '../frame.ts'
import { CANVAS_W, CANVAS_H } from '../frame.ts'
import { toHex } from '../palette.ts'
import { rasterize } from '../rasterize.ts'

export type SvgCrop = { x: number; y: number; w: number; h: number }
export type SvgOptions = {
  /** CSS pixels per canvas pixel. */
  scale: number
  /** Show only this part of the canvas (the band shows just the body and what is near it). */
  crop?: SvgCrop
}

/** The part of the canvas around the body: what the band and the little subagents show. */
export const SPRITE_CROP: SvgCrop = { x: 13, y: 0, w: 24, h: 15 }

export const escapeXml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** One path per color, each run of pixels a single rectangle, in canvas units. */
const pixelPaths = (frame: Frame): string => {
  const { px } = rasterize(frame)
  const byColor = new Map<number, string>()
  for (let y = 0; y < CANVAS_H; y++) {
    let x = 0
    while (x < CANVAS_W) {
      const color = px[y * CANVAS_W + x] as number
      if (color < 0) {
        x++
        continue
      }
      let end = x + 1
      while (end < CANVAS_W && px[y * CANVAS_W + end] === color) end++
      byColor.set(color, `${byColor.get(color) ?? ''}M${x} ${y}h${end - x}v1h-${end - x}z`)
      x = end
    }
  }
  return [...byColor].map(([color, d]) => `<path fill="${toHex(color)}" d="${d}"/>`).join('')
}

/** Text laid over the picture, one glyph per terminal cell (1 canvas pixel wide, 2 tall). */
const glyphTexts = (frame: Frame): string =>
  frame.glyphs
    .map(
      g =>
        `<text x="${g.col + 0.5}" y="${g.row * 2 + 1.5}" font-size="1.7" font-weight="700" ` +
        `text-anchor="middle" font-family="ui-monospace,Menlo,monospace" fill="${toHex(g.color)}">${escapeXml(g.ch)}</text>`,
    )
    .join('')

export const spriteSvg = (frame: Frame, { scale, crop }: SvgOptions): string => {
  const view = crop ?? { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view.x} ${view.y} ${view.w} ${view.h}" ` +
    `width="${view.w * scale}" height="${view.h * scale}" shape-rendering="crispEdges">` +
    pixelPaths(frame) +
    glyphTexts(frame) +
    `</svg>`
  )
}

/** The picture as nested content for composing into a larger SVG. */
export const spriteSvgInner = (frame: Frame): string => pixelPaths(frame) + glyphTexts(frame)
