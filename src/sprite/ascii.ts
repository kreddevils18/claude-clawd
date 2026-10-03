// Debug printer for tests and PR reviews: one character per pixel.

import { CANVAS_W } from './frame.ts'
import type { Frame } from './frame.ts'
import { PALETTE } from './palette.ts'
import { rasterize } from './rasterize.ts'

const GLYPH_BY_COLOR = new Map<number, string>([
  [PALETTE.body, '#'],
  [PALETTE.shade, '='],
  [PALETTE.dark, '@'],
  [PALETTE.white, 'o'],
  [PALETTE.blush, '~'],
])

export const frameToAscii = (frame: Frame): string => {
  const { px } = rasterize(frame)
  const lines: string[] = []
  for (let y = 0; y < px.length / CANVAS_W; y++) {
    let line = ''
    for (let x = 0; x < CANVAS_W; x++) {
      const c = px[y * CANVAS_W + x] as number
      line += c < 0 ? '.' : (GLYPH_BY_COLOR.get(c) ?? '*')
    }
    lines.push(line)
  }
  return lines.join('\n')
}
