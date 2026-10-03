import { defineState, within } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { HEART } from '../sprite/bitmaps.ts'

const PAT_MS = 2000

export const pat = defineState({
  id: 'pat',
  priority: PRIORITY.pat,
  matches: s => within(s.now, s.pattedAt, PAT_MS),
  frames: 8,
  frameMs: 125,
  durationMs: PAT_MS,
  since: s => s.pattedAt,
  draw: (b, f) => {
    // Happy wiggle with hearts floating up on both sides.
    b.body({ dx: [0, 1, 0, -1][f % 4] as number })
      .eyes('happy')
      .mouth('smile')
      .blush()
    b.prop(HEART, 35, 9 - (f % 8))
    b.prop(HEART, 9, 9 - ((f + 4) % 8))
  },
  mini: { eyes: 'closed', badge: '♥' },
  label: () => 'Hehe',
})
