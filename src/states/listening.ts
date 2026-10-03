import { defineState, within } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { BUBBLE } from '../sprite/bitmaps.ts'
import { PALETTE } from '../sprite/palette.ts'

/** Typing stops counting as typing after this long without an edit. */
const TYPING_MS = 1500

export const listening = defineState({
  id: 'listening',
  priority: PRIORITY.listening,
  matches: s => within(s.now, s.typingAt, TYPING_MS),
  frames: 8,
  frameMs: 250,
  draw: (b, f) => {
    // Leaning in to read along as you type: eyes track down the line, a little nod, a "…" bubble.
    const sweep = [-1, 0, 1, 0][Math.floor(f / 2) % 4] as number
    b.body({ dy: f % 4 === 3 ? -1 : 0, arms: { left: 'half', right: 'half' } })
      .eyes('down', { shiftX: sweep })
      .mouth(f % 4 < 2 ? 'o' : null)
      .prop(BUBBLE, 33, 0)
      .glyph(39, 1, '…', PALETTE.ink)
  },
  mini: { eyes: 'down', badge: '…' },
  label: () => 'Listening…',
})
