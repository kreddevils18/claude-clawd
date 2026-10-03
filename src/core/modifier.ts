// Decorator: effects layered on top of any state's frame, current or future.

import type { Profile, Signals } from '../../types/index.d.ts'
import type { Frame } from '../sprite/frame.ts'

export interface Modifier {
  id: string
  /** Return a new frame. Never mutate the input. */
  apply(frame: Frame, s: Signals, profile: Profile): Frame
}

/** Run the modifiers in order, skipping any the state opted out of. */
export const applyModifiers = (
  frame: Frame,
  s: Signals,
  profile: Profile,
  modifiers: readonly Modifier[],
  optOut: readonly string[] = [],
): Frame =>
  modifiers.reduce(
    (current, modifier) => (optOut.includes(modifier.id) ? current : modifier.apply(current, s, profile)),
    frame,
  )
