// The subagents' meadow for terminal-style surfaces: three rows of colored text, subagents standing
// in a field of flowers and sending each other hearts. A row is a list of spans.

import type { AgentScene } from '../agents/agent-view.ts'
import { merge, type Span } from '../hud/span.ts'
import { PALETTE, toHex } from '../sprite/palette.ts'
import { GRASS, GROUND, flowerColor, hash } from './flowers.ts'

export const MEADOW_ROWS = 3
const SLOT = 10 // a 9-cell logo and a cell between neighbors
const FLOWERS = ['✿', '❀', '✾', '❁'] as const
const BODY = toHex(PALETTE.body)

export const meadowWidth = (agents: number): number => (agents === 0 ? 0 : agents * SLOT + 2)

/** How many subagents fit in `columns` cells. */
export const agentsThatFit = (columns: number): number => Math.max(0, Math.floor((columns - 2) / SLOT))

type Cell = { ch: string; color?: string; bg?: string }

export const meadowRows = (agents: readonly AgentScene[], tick: number): Span[][] => {
  const width = meadowWidth(agents.length)
  const cells: Cell[][] = Array.from({ length: MEADOW_ROWS }, () =>
    Array.from({ length: width }, () => ({ ch: ' ' })),
  )

  // Subagents stand on the ground row, one slot each.
  agents.forEach((agent, i) => {
    agent.mini.glyphs.forEach((line, row) => {
      ;[...line].forEach((ch, c) => {
        if (ch !== ' ') (cells[row] as Cell[])[1 + i * SLOT + c] = { ch, color: BODY }
      })
    })
  })

  // Hearts drift up between neighbors: they are playing together.
  for (let i = 0; i < agents.length - 1; i++) {
    const row = (Math.floor(tick / 2) + i) % 2
    ;(cells[row] as Cell[])[1 + i * SLOT + 9] = { ch: '♥', color: '#f27ea9' }
  }

  // The field: flowers and grass wherever nothing stands, swaying a step each other tick.
  const ground = cells[MEADOW_ROWS - 1] as Cell[]
  ground.forEach((cell, col) => {
    cell.bg = GROUND
    if (cell.ch !== ' ') return
    const h = hash(col * 7 + 3)
    if (h % 3 === 0) {
      const sway = (Math.floor(tick / 2) + h) % 2
      ground[col] = {
        ch: FLOWERS[(h + sway) % FLOWERS.length] as string,
        color: flowerColor(h >>> 4),
        bg: GROUND,
      }
    } else if (h % 3 === 1) {
      ground[col] = { ch: h % 2 === 0 ? '"' : ',', color: GRASS, bg: GROUND }
    }
  })
  // A few flowers and petals above the ground, so the field is not flat.
  for (let row = 0; row < MEADOW_ROWS - 1; row++) {
    ;(cells[row] as Cell[]).forEach((cell, col) => {
      if (cell.ch !== ' ') return
      const h = hash(col * 31 + row * 17 + (Math.floor(tick / 3) % 3))
      if (h % 23 === 0) (cells[row] as Cell[])[col] = { ch: '·', color: flowerColor(h >>> 3) }
    })
  }

  return cells.map(row => merge(row.map(({ ch, color, bg }) => ({ text: ch, color, bg }))))
}
