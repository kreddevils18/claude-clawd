import { defineState } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { PROMPT, PUFF } from '../sprite/bitmaps.ts'
import { PALETTE } from '../sprite/palette.ts'

export const bash = defineState({
  id: 'bash',
  priority: PRIORITY.bash,
  matches: s => s.turn === 'tool' && s.tool === 'bash',
  frames: 8,
  frameMs: 125,
  draw: (b, f) => {
    // Running on the spot with a prompt blinking in the corner and dust at the feet.
    const step = f % 2 === 0
    b.body({
      dy: step ? 0 : -1,
      legs: step ? 'a' : 'b',
      arms: { left: step ? 'half' : 'down', right: step ? 'down' : 'half' },
    })
      .eyes('wide')
      .mouth('o')
      .prop(PROMPT, 6, 2, f % 4 < 2 ? undefined : { '#': PALETTE.sparkSoft })
    b.prop(PUFF, 14 - (f % 4), 13)
  },
  mini: { eyes: 'wide', badge: '$' },
  label: () => 'Running a command…',
})
