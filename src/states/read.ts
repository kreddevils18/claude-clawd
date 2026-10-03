import { defineState } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { BOOK } from '../sprite/bitmaps.ts'

export const read = defineState({
  id: 'read',
  priority: PRIORITY.read,
  matches: s => s.turn === 'tool' && s.tool === 'read',
  frames: 8,
  frameMs: 250,
  draw: (b, f) => {
    // Eyes sweep along the lines of a book held in front.
    const sweep = [-1, 0, 1, 0][Math.floor(f / 2) % 4] as number
    b.body({ arms: { left: 'half', right: 'half' } })
      .eyes('down', { shiftX: sweep })
      .mouth('flat')
      .prop(BOOK, 19, 10)
  },
  mini: { eyes: 'down', badge: '=' },
  label: () => 'Reading…',
})
