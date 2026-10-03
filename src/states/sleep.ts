import { defineState } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { Z, Z_SMALL } from '../sprite/bitmaps.ts'

const IDLE_BEFORE_SLEEP_MS = 60_000

export const sleep = defineState({
  id: 'sleep',
  priority: PRIORITY.sleep,
  matches: s => s.turn === 'idle' && s.now - s.idleSince > IDLE_BEFORE_SLEEP_MS,
  frames: 8,
  frameMs: 500,
  draw: (b, f) => {
    // Curled up (legs tucked) and sunk one row; zZ rise from the right.
    b.body({ dy: 1, legs: 'jump', arms: { left: 'down', right: 'down' } }).eyes('closed')
    for (let k = 0; k < 3; k++) {
      const y = 9 - ((f + k * 3) % 8)
      b.prop(k === 1 ? Z : Z_SMALL, 35 + k * 3, y)
    }
  },
  mini: { eyes: 'closed', badge: 'z' },
  label: () => 'Zzz…',
})
