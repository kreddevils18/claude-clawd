import { defineState } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { BANG, BUBBLE } from '../sprite/bitmaps.ts'
import { PALETTE } from '../sprite/palette.ts'

export const wait = defineState({
  id: 'wait',
  priority: PRIORITY.wait,
  matches: s => s.waitingForUser,
  frames: 8,
  frameMs: 125,
  draw: (b, f) => {
    // Hopping and waving for attention, with a "!" bubble.
    const up = [0, -1, -2, -1][f % 4] as number
    b.body({
      dy: up,
      legs: up < -1 ? 'jump' : 'stand',
      arms: { left: f % 2 === 0 ? 'up' : 'half', right: f % 2 === 0 ? 'half' : 'up' },
    })
      .eyes('wide')
      .mouth('o')
      .prop(BUBBLE, 33, 0)
      .glyph(39, 1, '!', PALETTE.danger)
    if (f % 2 === 0) b.prop(BANG, 10, 3)
  },
  mini: { eyes: 'wide', badge: '!' },
  label: () => 'Waiting for you',
  sound: 'pip',
})
