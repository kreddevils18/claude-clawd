// Draws the active state's frame, then lets the modifiers decorate it.

import type { Profile } from '../../types/index.d.ts'
import { MODIFIERS } from '../modifiers/index.ts'
import type { Frame } from '../sprite/frame.ts'
import { sprite } from '../sprite/sprite-builder.ts'
import { frameIndex, type ClawdState } from './clawd-state.ts'
import { applyModifiers } from './modifier.ts'
import type { Signals } from './signals.ts'

export const composeFrame = (
  state: ClawdState,
  s: Signals,
  profile: Profile,
  frame: number = frameIndex(state, s),
): Frame => {
  const b = sprite()
  state.draw(b, frame, s)
  b.miniEyes(state.mini.eyes).badge(state.mini.badge ?? null)
  return applyModifiers(b.build(), s, profile, MODIFIERS, state.optOut)
}
