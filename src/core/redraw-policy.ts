// Decides when a new snapshot is worth storing: a store write redraws the band and the pane,
// so clock-only changes must not trigger one unless they flip the active state.

import { differsBeyondClock } from './signal-store.ts'
import { selectState } from './state-registry.ts'
import type { Signals } from './signals.ts'

export const worthStoring = (prev: Signals, next: Signals): boolean =>
  differsBeyondClock(prev, next) || selectState(prev).id !== selectState(next).id
