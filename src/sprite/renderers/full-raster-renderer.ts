// Full pane: 50×16 pixels → 50 columns × 8 rows of half-block cells, packed for <Raster>.

import { toBase64 } from '../base64.ts'
import type { Frame } from '../frame.ts'
import { COLUMNS, ROWS, frameToCells } from './cells.ts'
import type { Renderer, Theme } from './renderer.ts'

export type RasterOutput = { columns: number; rows: number; cells: string }

export const fullRasterRenderer: Renderer<RasterOutput> = {
  render(frame: Frame, theme: Theme): RasterOutput {
    const cells = frameToCells(frame, theme)
    const words = new Uint32Array(cells.length * 3)
    cells.forEach((cell, i) => {
      words[i * 3] = cell.ch.codePointAt(0) as number
      words[i * 3 + 1] = cell.fg
      words[i * 3 + 2] = cell.bg
    })
    // Little-endian u32 triplets; build the bytes by hand so host endianness never matters.
    const bytes = new Uint8Array(words.length * 4)
    words.forEach((w, i) => {
      bytes[i * 4] = w & 0xff
      bytes[i * 4 + 1] = (w >>> 8) & 0xff
      bytes[i * 4 + 2] = (w >>> 16) & 0xff
      bytes[i * 4 + 3] = (w >>> 24) & 0xff
    })
    return { columns: COLUMNS, rows: ROWS, cells: toBase64(bytes) }
  },
}
