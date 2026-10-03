import { expect, test } from 'claude-code/testing'

import { allStates, selectState } from '../src/core/state-registry.ts'
import type { Signals } from '../src/core/signals.ts'
import { signalsAt, T0 } from './fixtures.ts'

const ago = (ms: number) => T0 - ms

type Row = { name: string; signals: Partial<Signals>; expected: string }

const rows: Row[] = [
  // One row per state.
  { name: 'nothing happening', signals: {}, expected: 'idle' },
  { name: 'idle for over a minute', signals: { idleSince: ago(61_000) }, expected: 'sleep' },
  { name: 'idle for under a minute', signals: { idleSince: ago(59_000) }, expected: 'idle' },
  { name: 'model is thinking', signals: { turn: 'thinking' }, expected: 'think' },
  { name: 'an other tool runs', signals: { turn: 'tool', tool: 'other' }, expected: 'think' },
  { name: 'reading', signals: { turn: 'tool', tool: 'read' }, expected: 'read' },
  { name: 'editing', signals: { turn: 'tool', tool: 'edit' }, expected: 'edit' },
  { name: 'running bash', signals: { turn: 'tool', tool: 'bash' }, expected: 'bash' },
  { name: 'permission prompt open', signals: { waitingForUser: true }, expected: 'wait' },
  { name: 'a tool just failed', signals: { lastTool: { kind: 'bash', failed: true, at: ago(1000) } }, expected: 'fail' },
  { name: 'the failure is old news', signals: { lastTool: { kind: 'bash', failed: true, at: ago(4500) } }, expected: 'idle' },
  { name: 'a tool succeeded', signals: { lastTool: { kind: 'bash', failed: false, at: ago(500) } }, expected: 'idle' },
  { name: 'turn just completed', signals: { turnCompletedAt: ago(500) }, expected: 'done' },
  { name: 'done has worn off', signals: { turnCompletedAt: ago(2500) }, expected: 'idle' },
  { name: 'just compacted', signals: { compactedAt: ago(1000) }, expected: 'burp' },
  { name: 'compaction is over', signals: { compactedAt: ago(3000) }, expected: 'idle' },
  { name: 'just leveled up', signals: { leveledUpAt: ago(1000), level: 4 }, expected: 'level-up' },
  { name: 'just patted', signals: { pattedAt: ago(500) }, expected: 'pat' },
  { name: 'typing in the prompt', signals: { typingAt: ago(500) }, expected: 'listening' },
  { name: 'typing stopped a while ago', signals: { typingAt: ago(1600) }, expected: 'idle' },
  { name: 'limit warning at 80', signals: { fiveHourPct: 80 }, expected: 'limit-warn' },
  { name: 'below the warning', signals: { fiveHourPct: 79.9 }, expected: 'idle' },
  { name: 'off a subscription', signals: { fiveHourPct: null }, expected: 'idle' },
  { name: 'limit hit at 100', signals: { fiveHourPct: 100 }, expected: 'limit-hit' },
  // Conflicts: the approved order wins.
  { name: 'wait beats fail', signals: { waitingForUser: true, lastTool: { kind: 'edit', failed: true, at: ago(100) } }, expected: 'wait' },
  { name: 'fail beats limit-hit', signals: { fiveHourPct: 100, lastTool: { kind: 'edit', failed: true, at: ago(100) } }, expected: 'fail' },
  { name: 'limit-hit beats burp', signals: { fiveHourPct: 100, compactedAt: ago(100) }, expected: 'limit-hit' },
  { name: 'burp beats level-up', signals: { compactedAt: ago(100), leveledUpAt: ago(100) }, expected: 'burp' },
  { name: 'level-up beats pat', signals: { leveledUpAt: ago(100), pattedAt: ago(100) }, expected: 'level-up' },
  { name: 'pat beats done', signals: { pattedAt: ago(100), turnCompletedAt: ago(100) }, expected: 'pat' },
  { name: 'done beats a running tool', signals: { turnCompletedAt: ago(100), turn: 'tool', tool: 'edit' }, expected: 'done' },
  { name: 'edit beats limit-warn', signals: { turn: 'tool', tool: 'edit', fiveHourPct: 85 }, expected: 'edit' },
  { name: 'think beats limit-warn', signals: { turn: 'thinking', fiveHourPct: 85 }, expected: 'think' },
  { name: 'think beats listening', signals: { turn: 'thinking', typingAt: ago(100) }, expected: 'think' },
  { name: 'listening beats limit-warn', signals: { typingAt: ago(100), fiveHourPct: 85 }, expected: 'listening' },
  { name: 'listening beats sleep', signals: { typingAt: ago(100), idleSince: ago(120_000) }, expected: 'listening' },
  { name: 'limit-warn beats sleep', signals: { fiveHourPct: 85, idleSince: ago(120_000) }, expected: 'limit-warn' },
  { name: 'a failure while editing shows the failure', signals: { turn: 'tool', tool: 'edit', lastTool: { kind: 'bash', failed: true, at: ago(100) } }, expected: 'fail' },
]

test('selectState follows the approved priority table', () => {
  for (const row of rows) {
    expect(selectState(signalsAt(row.signals)).id, row.name).toBe(row.expected)
  }
})

test('every registered state is the winner for at least one fixture', () => {
  const winners = new Set(rows.map(r => selectState(signalsAt(r.signals)).id))
  for (const state of allStates()) expect(winners.has(state.id), `${state.id} has no selector row`).toBe(true)
})

test('the shipped states keep the documented priority order', () => {
  const shipped = [
    'wait', 'fail', 'limit-hit', 'burp', 'level-up', 'pat', 'done',
    'edit', 'bash', 'read', 'think', 'listening', 'limit-warn', 'sleep', 'idle',
  ]
  const order = [...allStates()].sort((a, b) => b.priority - a.priority).map(s => s.id)
  // New states may slot in anywhere; the shipped ones must stay in this relative order.
  expect(order.filter(id => shipped.includes(id))).toEqual(shipped)
})
