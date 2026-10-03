// Mini band: the original 9×3 logo from an 18×6 pixel grid, one quadrant glyph per 2×2 pixels.
// The logo follows the frame's pose: arms, legs, body size and eye shape all change with the state.

import type { ArmPose, EyeShape, Frame, LegPose } from '../frame.ts'
import { PALETTE } from '../palette.ts'
import type { Renderer, Theme } from './renderer.ts'

export const MINI_COLUMNS = 9
export const MINI_ROWS = 3
const GRID_W = MINI_COLUMNS * 2
const GRID_H = MINI_ROWS * 2

// Quadrant glyphs indexed by mask: top-left 1, top-right 2, bottom-left 4, bottom-right 8.
const QUADRANTS = [' ', '▘', '▝', '▀', '▖', '▌', '▞', '▛', '▗', '▚', '▐', '▜', '▄', '▙', '▟', '█']

const BODY_FROM = 3
const BODY_TO = 14
const NOTCH_X: readonly number[] = [5, 12] // the eye notches of the logo, in its second pixel row

/** Pixels (top, bottom) of each notch that stay filled, by eye shape. */
const NOTCH_FILL: Readonly<Record<EyeShape, readonly [boolean, boolean]>> = Object.freeze({
  open: [true, false],
  down: [true, false],
  tired: [true, false],
  closed: [true, true],
  happy: [true, true],
  x: [true, true],
  wide: [false, false],
  up: [false, false],
})

/** Pixel row of an arm, by pose; the logo's own arms sit on row 2. */
const ARM_ROW: Readonly<Record<ArmPose, number>> = { side: 2, up: 0, half: 1, down: 3, wide: 2 }

/** Which of the four legs (outer left, inner left, inner right, outer right) touch down. */
const LEGS_DOWN: Readonly<Record<LegPose, readonly number[]>> = {
  stand: [0, 1, 2, 3],
  a: [0, 2],
  b: [1, 3],
  jump: [],
}
const LEG_X: readonly number[] = [4, 6, 11, 13]

const logoPixels = (frame: Frame): boolean[][] => {
  const { body } = frame
  const grid = Array.from({ length: GRID_H }, () => new Array<boolean>(GRID_W).fill(false))
  const set = (x: number, y: number, on = true) => {
    if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) (grid[y] as boolean[])[x] = on
  }
  const run = (from: number, to: number, y: number) => {
    for (let x = from; x <= to; x++) set(x, y)
  }

  // Body, widened by the context size.
  for (let y = 0; y < 4; y++) run(BODY_FROM - body.fat, BODY_TO + body.fat, y)

  // Eye notches.
  const [top, bottom] = NOTCH_FILL[frame.miniEyes]
  for (const x of NOTCH_X) {
    set(x, 0, top)
    set(x, 1, bottom)
  }

  // Arms: one pixel tall, reaching further out when wide.
  const reach = (pose: ArmPose) => (pose === 'wide' ? 1 : 0)
  const left = body.arms.left
  const right = body.arms.right
  run(1 - body.fat - reach(left), 2 - body.fat, ARM_ROW[left])
  run(15 + body.fat, 16 + body.fat + reach(right), ARM_ROW[right])

  // Legs under the body.
  const legRow = 4
  for (const i of LEGS_DOWN[body.legs]) set((LEG_X[i] as number) + (i < 2 ? -body.fat : body.fat), legRow)

  // Sinking (a sleeping Clawd) moves the whole picture down a pixel.
  if (body.dy > 0) {
    grid.pop()
    grid.unshift(new Array<boolean>(GRID_W).fill(false))
  }
  return grid
}

export type MiniOutput = {
  /** Three strings, each exactly 9 cells wide. */
  glyphs: [string, string, string]
  badge: string
  color: number
}

export const miniQuadrantRenderer: Renderer<MiniOutput> = {
  render(frame: Frame, _theme: Theme): MiniOutput {
    const grid = logoPixels(frame)
    const lines: string[] = []
    for (let row = 0; row < MINI_ROWS; row++) {
      let line = ''
      for (let col = 0; col < MINI_COLUMNS; col++) {
        const at = (dx: number, dy: number) => (grid[row * 2 + dy] as boolean[])[col * 2 + dx]
        const mask = (at(0, 0) ? 1 : 0) | (at(1, 0) ? 2 : 0) | (at(0, 1) ? 4 : 0) | (at(1, 1) ? 8 : 0)
        line += QUADRANTS[mask]
      }
      lines.push(line)
    }
    return {
      glyphs: lines as [string, string, string],
      badge: frame.badge ?? '',
      color: PALETTE.body,
    }
  },
}
