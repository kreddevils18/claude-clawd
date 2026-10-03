// Shared fixtures for the state tests.

import type { Profile, Signals } from '../types/index.d.ts'
import { initialSignals } from '../src/core/signals.ts'
import { DEFAULT_PROFILE } from '../src/progression/xp.ts'

export const T0 = 10_000_000

export const signalsAt = (patch: Partial<Signals> = {}): Signals => ({ ...initialSignals(T0), ...patch })

/** A snapshot with every trigger at its most extreme: every state's draw is exercised hard. */
export const EXTREME: Signals = signalsAt({
  turn: 'tool',
  tool: 'edit',
  lastTool: { kind: 'bash', failed: true, at: T0 - 100 },
  waitingForUser: true,
  turnCompletedAt: T0 - 100,
  contextPct: 100,
  fiveHourPct: 100,
  compactedAt: T0 - 100,
  pattedAt: T0 - 100,
  leveledUpAt: T0 - 100,
  level: 99,
  typingAt: T0 - 100,
  agents: [
    { id: 'a1', name: 'Explore', startedAt: T0 - 5000, activeAt: T0 - 100, endedAt: null, tool: 'read', toolsInFlight: 1, lastTool: null },
    { id: 'a2', name: 'agent', startedAt: T0 - 4000, activeAt: T0 - 1000, endedAt: T0 - 1000, tool: null, toolsInFlight: 0, lastTool: { kind: 'bash', failed: true, at: T0 - 1500 } },
  ],
})

export const NEUTRAL: Signals = signalsAt()

export const profileWith = (patch: Partial<Profile> = {}): Profile => ({ ...DEFAULT_PROFILE, ...patch })

/** Highest level: wizard hat unlocked and worn. */
export const MAX_PROFILE: Profile = profileWith({ xp: 3000, level: 10 })
