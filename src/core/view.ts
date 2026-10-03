// What to show right now: the active state and its decorated frame, for a given moment.

import type { Profile, Signals } from '../../types/index.d.ts'
import type { Frame } from '../sprite/frame.ts'
import type { ClawdState } from './clawd-state.ts'
import { composeFrame } from './compose.ts'
import { withDefaults } from './signals.ts'
import { selectState } from './state-registry.ts'

export type View = { state: ClawdState; signals: Signals; frame: Frame }

/** The stored snapshot's clock can be stale between redraws, so callers pass the real time. */
export const viewAt = (stored: Partial<Signals>, profile: Profile, now: number): View => {
  const complete = withDefaults(stored, now)
  const signals = { ...complete, now: Math.max(complete.now, now) }
  const state = selectState(signals)
  return { state, signals, frame: composeFrame(state, signals, profile) }
}
