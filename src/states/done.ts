import { defineState, within } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { SPARK, SPARK_SMALL } from '../sprite/bitmaps.ts'
import { PALETTE } from '../sprite/palette.ts'

const DONE_MS = 2000

export const done = defineState({
  id: 'done',
  priority: PRIORITY.done,
  matches: s => within(s.now, s.turnCompletedAt, DONE_MS),
  frames: 8,
  frameMs: 125,
  durationMs: DONE_MS,
  since: s => s.turnCompletedAt,
  draw: (b, f) => {
    // Hooray: a hop with both arms up and confetti.
    const hop = [0, -1, -2, -2, -1, 0, 0, 0][f] as number
    b.body({ dy: hop, legs: hop < -1 ? 'jump' : 'stand', arms: { left: 'up', right: 'up' } })
      .eyes('happy')
      .mouth('smile')
      .prop(f % 2 === 0 ? SPARK : SPARK_SMALL, 9, 3 + (f % 3))
      .prop(f % 2 === 0 ? SPARK_SMALL : SPARK, 36, 2 + (f % 3))
      .particles(200 + f, 5, [PALETTE.spark, PALETTE.heart, PALETTE.sweat], { x: 5, y: 0, w: 11, h: 14 })
      .particles(300 + f, 5, [PALETTE.spark, PALETTE.battery, PALETTE.night], { x: 34, y: 2, w: 11, h: 12 })
  },
  mini: { eyes: 'closed', badge: '✓' },
  label: () => 'Done!',
})
