import { defineState } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { agentsRunning } from '../core/signals.ts'
import { PALETTE } from '../sprite/palette.ts'

export const think = defineState({
  id: 'think',
  priority: PRIORITY.think,
  matches: s => s.turn === 'thinking' || (s.turn === 'tool' && s.tool === 'other'),
  frames: 8,
  frameMs: 250,
  draw: (b, f, s) => {
    // Directing subagents: both arms conduct. Otherwise one hand goes to the chin.
    const conducting = agentsRunning(s) > 0
    const arms = conducting
      ? { left: f % 4 < 2 ? 'up' : 'half', right: f % 4 < 2 ? 'half' : 'up' }
      : { right: 'half' }
    b.body({ arms } as never).eyes('up', { shiftX: f % 4 < 2 ? 0 : 1 }).mouth(conducting ? 'smile' : 'flat')
    // Three thought dots; the lit one climbs a pixel.
    const lit = Math.floor(f / 2) % 3
    for (let k = 0; k < 3; k++) {
      b.rect(34 + k * 3, k === lit ? 2 : 3, 2, 2, k === lit ? PALETTE.white : PALETTE.cloud)
    }
  },
  mini: { eyes: 'up', badge: '?' },
  label: s => {
    const n = agentsRunning(s)
    return n === 0 ? 'Thinking…' : n === 1 ? 'Directing 1 agent…' : `Directing ${n} agents…`
  },
})
