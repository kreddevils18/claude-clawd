import { defineState } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { BATTERY_EMPTY, Z_SMALL } from '../sprite/bitmaps.ts'
import { PALETTE } from '../sprite/palette.ts'

export const limitHit = defineState({
  id: 'limit-hit',
  priority: PRIORITY.limitHit,
  matches: s => s.fiveHourPct !== null && s.fiveHourPct >= 100,
  frames: 8,
  frameMs: 500,
  draw: (b, f) => {
    // Out of juice: slumped, eyes shut, an empty battery that blinks.
    b.body({ dy: 1, legs: 'jump', arms: { left: 'down', right: 'down' } })
      .eyes('closed')
      .mouth('sad')
      .prop(BATTERY_EMPTY, 6, 2, f % 2 === 0 ? undefined : { '#': PALETTE.warn })
      .prop(Z_SMALL, 35 + (f % 3), 8 - (f % 4))
  },
  mini: { eyes: 'closed', badge: '×' },
  label: () => '5h limit reached',
})
