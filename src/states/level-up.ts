import { defineState, within } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { SPARK, SPARK_SMALL } from '../sprite/bitmaps.ts'
import { PALETTE } from '../sprite/palette.ts'

const LEVEL_UP_MS = 3000

export const levelUp = defineState({
  id: 'level-up',
  priority: PRIORITY.levelUp,
  matches: s => within(s.now, s.leveledUpAt, LEVEL_UP_MS),
  frames: 12,
  frameMs: 125,
  durationMs: LEVEL_UP_MS,
  since: s => s.leveledUpAt,
  draw: (b, f, s) => {
    // Victory pose, a ring of sparkles and the new level up in the corner.
    const hop = [0, -1, -2, -2, -1, 0][f % 6] as number
    b.body({ dy: hop, legs: hop < -1 ? 'jump' : 'stand', arms: { left: 'up', right: 'up' } })
      .eyes('wide')
      .mouth('smile')
      .prop(f % 2 === 0 ? SPARK : SPARK_SMALL, 9, 6 + (f % 3))
      .prop(f % 2 === 0 ? SPARK_SMALL : SPARK, 36, 6 + (f % 3))
      .particles(400 + f, 6, [PALETTE.spark, PALETTE.sparkSoft, PALETTE.white], { x: 0, y: 0, w: 50, h: 4 })
      .text(1, 0, `LEVEL ${s.level}`, PALETTE.spark)
  },
  mini: { eyes: 'wide', badge: '★' },
  label: s => `Level ${s.level}!`,
})
