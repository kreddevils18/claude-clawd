import { defineState } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { BATTERY_LOW, SWEAT } from '../sprite/bitmaps.ts'
import { PALETTE } from '../sprite/palette.ts'

export const limitWarn = defineState({
  id: 'limit-warn',
  priority: PRIORITY.limitWarn,
  matches: s => s.fiveHourPct !== null && s.fiveHourPct >= 80,
  frames: 8,
  frameMs: 250,
  draw: (b, f) => {
    // Tired: heavy lids, drooping arms, a low battery that blinks red.
    b.body({ arms: { left: 'down', right: 'down' } })
      .eyes('tired')
      .mouth('flat')
      .prop(BATTERY_LOW, 6, 2, f % 4 < 2 ? undefined : { w: PALETTE.danger })
      .prop(SWEAT, 34, 5 + (f % 4 < 2 ? 0 : 1))
  },
  mini: { eyes: 'tired', badge: '%' },
  label: s => `5h limit at ${Math.round(s.fiveHourPct ?? 0)}%`,
})
