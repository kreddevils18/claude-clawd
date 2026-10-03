import { defineState, within } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { PUFF } from '../sprite/bitmaps.ts'

const BURP_MS = 2500

// Puffs up as the context is squeezed, then lets it out.
const FAT = [0, 1, 2, 2, 2, 1, 0, 0] as const

export const burp = defineState({
  id: 'burp',
  priority: PRIORITY.burp,
  matches: s => within(s.now, s.compactedAt, BURP_MS),
  frames: 20,
  frameMs: 125,
  durationMs: BURP_MS,
  since: s => s.compactedAt,
  optOut: ['context-size'],
  draw: (b, f) => {
    const fat = FAT[Math.min(f, FAT.length - 1)] as 0 | 1 | 2
    const released = f >= 5
    b.body({ fat, arms: { left: 'half', right: 'half' } })
      .eyes('closed')
      .mouth(released ? 'o' : 'flat')
    if (released) {
      const t = f - 5
      b.prop(PUFF, Math.min(33 + t, 42), Math.max(6, 11 - Math.floor(t / 2)))
    }
  },
  mini: { eyes: 'closed', badge: 'o' },
  label: () => 'Compacted. Burp!',
  sound: 'burp',
})
