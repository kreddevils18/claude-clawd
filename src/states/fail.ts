import { defineState, within } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { CLOUD, SWEAT } from '../sprite/bitmaps.ts'
import { PALETTE } from '../sprite/palette.ts'

const FAIL_MS = 4000

export const fail = defineState({
  id: 'fail',
  priority: PRIORITY.fail,
  matches: s => s.lastTool !== null && s.lastTool.failed && within(s.now, s.lastTool.at, FAIL_MS),
  frames: 8,
  frameMs: 125,
  durationMs: FAIL_MS,
  since: s => s.lastTool?.at ?? null,
  draw: (b, f) => {
    // A tool failed: shaken, x-eyes, a little storm cloud and a sweat drop.
    b.body({ dx: f % 2 === 0 ? -1 : 1, arms: { left: 'down', right: 'down' } })
      .eyes('x')
      .mouth('sad')
      .prop(CLOUD, 8, 1, { '#': PALETTE.steel })
      .prop(SWEAT, 34, 5 + (f % 4 < 2 ? 0 : 1))
    b.rect(10 + (f % 3) * 2, 6, 1, 2, PALETTE.danger)
  },
  mini: { eyes: 'x', badge: '✗' },
  label: () => 'That did not work',
})
