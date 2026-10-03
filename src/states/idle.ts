import { defineState } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'

// Fallback: always matches. 16 frames × 250 ms = a blink every 4 seconds.
export const idle = defineState({
  id: 'idle',
  priority: PRIORITY.idle,
  matches: () => true,
  frames: 16,
  frameMs: 250,
  draw: (b, f) => {
    b.body().eyes(f === 15 ? 'closed' : 'open').mouth('smile')
  },
  mini: { eyes: 'open' },
  label: () => 'Ready',
})
