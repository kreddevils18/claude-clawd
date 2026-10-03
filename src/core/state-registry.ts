// Registry + priority: the highest-priority matching state wins; idle always matches.

import type { ClawdState } from './clawd-state.ts'
import type { Signals } from './signals.ts'
import { STATES } from '../states/index.ts'

const BY_PRIORITY: readonly ClawdState[] = [...STATES].sort((a, b) => b.priority - a.priority)

export const allStates = (): readonly ClawdState[] => STATES

export const selectState = (s: Signals): ClawdState => {
  const found = BY_PRIORITY.find(state => state.matches(s))
  if (!found) throw new Error('no Clawd state matches: the idle state must always match')
  return found
}
