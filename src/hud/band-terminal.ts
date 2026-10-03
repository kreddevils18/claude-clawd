// The band for terminal-style surfaces: three rows, Clawd on the left, the subagents' meadow
// on the right edge. Every row is a list of colored text spans, padded to the full width.

import { agentsThatFit, meadowRows, meadowWidth, MEADOW_ROWS } from '../scene/meadow-terminal.ts'
import { PALETTE, toHex } from '../sprite/palette.ts'
import type { BandModel } from './band-model.ts'
import { merge, width, type Span } from './span.ts'

const BODY = toHex(PALETTE.body)
const BADGE = toHex(PALETTE.spark)
const LOGO = 9
const GAP = 2

export const titleSpans = (m: BandModel): Span[] => [
  { text: m.name, color: BODY, bold: true },
  { text: ` · Lv ${m.level} · `, dim: true },
  { text: m.label, bold: true },
]

/** Three rows for a band `columns` wide: logo and text, then padding, then the meadow. */
export const terminalBand = (m: BandModel, columns: number, tick: number): Span[][] => {
  const textRows: Span[][] = [
    titleSpans(m),
    m.agentLine ? [{ text: m.agentLine, dim: true }] : [],
    m.mini.badge ? [{ text: m.mini.badge, color: BADGE }] : [],
  ]
  const textWidth = Math.max(...textRows.map(width))
  const room = Math.max(0, columns - 1 - LOGO - GAP - textWidth - 2)
  const fit = agentsThatFit(room)
  const shown = m.agents.slice(0, fit)
  const meadow = shown.length > 0 ? meadowRows(shown, tick) : null
  const meadowW = meadowWidth(shown.length)

  return textRows.map((text, row) => {
    const left: Span[] = [{ text: m.mini.glyphs[row] as string, color: BODY }, { text: ' '.repeat(GAP) }, ...text]
    if (!meadow) return merge(left)
    const pad = Math.max(1, columns - 1 - width(left) - meadowW)
    return merge([...left, { text: ' '.repeat(pad) }, ...(meadow[row] as Span[])])
  })
}

/** Under the full-size picture in the pane: the title, the agent count, then the meadow. */
export const paneLines = (m: BandModel, columns: number, tick: number): Span[][] => {
  const lines: Span[][] = [titleSpans(m)]
  if (m.agentLine) lines.push([{ text: m.agentLine, dim: true }])
  const shown = m.agents.slice(0, agentsThatFit(columns))
  if (shown.length > 0) lines.push(...meadowRows(shown, tick).slice(0, MEADOW_ROWS))
  return lines
}
