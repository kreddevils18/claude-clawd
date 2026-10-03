import { defineState } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { PENCIL } from '../sprite/bitmaps.ts'
import { PALETTE } from '../sprite/palette.ts'

export const edit = defineState({
  id: 'edit',
  priority: PRIORITY.edit,
  matches: s => s.turn === 'tool' && s.tool === 'edit',
  frames: 8,
  frameMs: 125,
  draw: (b, f) => {
    // Typing: the arms take turns, a pencil scribbles, sparks fly off.
    const left = f % 2 === 0
    b.body({ arms: { left: left ? 'half' : 'side', right: left ? 'side' : 'half' } })
      .eyes('open')
      .mouth('flat')
      .prop(PENCIL, 35, 9 + (f % 4 < 2 ? 0 : 1))
      .particles(100 + f, 3, [PALETTE.spark, PALETTE.sparkSoft], { x: 35, y: 4, w: 8, h: 4 })
  },
  mini: { eyes: 'open', badge: '✎' },
  label: () => 'Editing…',
})
