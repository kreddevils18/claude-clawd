// Turns what Claude Code reports about usage into one SignalEvent. Structural types only:
// no import from the engine, so this stays pure and testable.

import type { SignalEvent } from './signals.ts'

export type UsageReport = {
  context: { percent?: number }
  rateLimits: readonly { kind: string; percentUsed: number }[]
}

export const usageEvent = (at: number, usage: UsageReport): SignalEvent => ({
  kind: 'usage.measured',
  at,
  contextPct: usage.context.percent ?? 0,
  fiveHourPct: usage.rateLimits.find(limit => limit.kind === 'five_hour')?.percentUsed ?? null,
})
