import { expect, test } from 'claude-code/testing'

import { reduce } from '../src/core/signal-store.ts'
import { AGENT_LINGER_MS, AGENT_STALE_MS, MAX_AGENTS, initialSignals, toolKindOf, type AgentInfo, type SignalEvent, type Signals } from '../src/core/signals.ts'

const T0 = 1_000_000
const at = (ms: number) => T0 + ms

type Row = {
  name: string
  from?: Partial<Signals>
  event: SignalEvent
  expected: Partial<Signals>
}

const rows: Row[] = [
  {
    name: 'turn.started thinks and clears the done mark',
    from: { turnCompletedAt: at(0) },
    event: { kind: 'turn.started', at: at(10) },
    expected: { turn: 'thinking', tool: null, turnCompletedAt: null, now: at(10) },
  },
  {
    name: 'step.started while idle stays idle',
    event: { kind: 'step.started', at: at(10) },
    expected: { turn: 'idle' },
  },
  {
    name: 'step.started mid-turn goes back to thinking',
    from: { turn: 'tool', tool: 'bash' },
    event: { kind: 'step.started', at: at(10) },
    expected: { turn: 'thinking', tool: null },
  },
  {
    name: 'tool.started records the kind',
    from: { turn: 'thinking' },
    event: { kind: 'tool.started', at: at(10), tool: 'edit' },
    expected: { turn: 'tool', tool: 'edit', toolsInFlight: 1 },
  },
  {
    name: 'a tool outside a turn is counted but does not move Clawd',
    event: { kind: 'tool.started', at: at(10), tool: 'read' },
    expected: { turn: 'idle', tool: null, toolsInFlight: 1 },
  },
  {
    name: 'a background tool finishing while idle stays idle',
    from: { toolsInFlight: 1 },
    event: { kind: 'tool.finished', at: at(10), tool: 'read', failed: false },
    expected: { turn: 'idle', tool: null, toolsInFlight: 0 },
  },
  {
    name: 'parallel tools: the first to finish leaves Clawd on the tool',
    from: { turn: 'tool', tool: 'read', toolsInFlight: 2 },
    event: { kind: 'tool.finished', at: at(10), tool: 'read', failed: false },
    expected: { turn: 'tool', tool: 'read', toolsInFlight: 1 },
  },
  {
    name: 'a live wait outlasts a sibling tool finishing',
    from: { turn: 'tool', tool: 'bash', toolsInFlight: 2, waitingForUser: true },
    event: { kind: 'tool.finished', at: at(10), tool: 'read', failed: false },
    expected: { waitingForUser: true, toolsInFlight: 1 },
  },
  {
    name: 'the last tool finishing clears the wait and goes back to thinking',
    from: { turn: 'tool', tool: 'bash', toolsInFlight: 1, waitingForUser: true },
    event: { kind: 'tool.finished', at: at(10), tool: 'bash', failed: false },
    expected: { turn: 'thinking', tool: null, waitingForUser: false, toolsInFlight: 0 },
  },
  {
    name: 'tool.finished records lastTool and clears waiting',
    from: { turn: 'tool', tool: 'bash', waitingForUser: true, toolsInFlight: 1 },
    event: { kind: 'tool.finished', at: at(20), tool: 'bash', failed: true },
    expected: {
      turn: 'thinking',
      tool: null,
      waitingForUser: false,
      lastTool: { kind: 'bash', failed: true, at: at(20) },
    },
  },
  {
    name: 'waiting.changed sets the flag',
    event: { kind: 'waiting.changed', at: at(10), waiting: true },
    expected: { waitingForUser: true },
  },
  {
    name: 'turn.completed goes idle and stamps done',
    from: { turn: 'thinking', waitingForUser: true },
    event: { kind: 'turn.completed', at: at(30) },
    expected: {
      turn: 'idle',
      waitingForUser: false,
      turnCompletedAt: at(30),
      idleSince: at(30),
    },
  },
  {
    name: 'usage.measured clamps context and keeps a null limit',
    event: { kind: 'usage.measured', at: at(10), contextPct: 140, fiveHourPct: null },
    expected: { contextPct: 100, fiveHourPct: null },
  },
  {
    name: 'usage.measured keeps the limit percent',
    event: { kind: 'usage.measured', at: at(10), contextPct: 42, fiveHourPct: 81.5 },
    expected: { contextPct: 42, fiveHourPct: 81.5 },
  },
  {
    name: 'an aborted turn goes idle without a done mark',
    from: { turn: 'thinking', turnCompletedAt: null },
    event: { kind: 'turn.completed', at: at(35), aborted: true },
    expected: { turn: 'idle', turnCompletedAt: null, idleSince: at(35) },
  },
  {
    name: 'level.loaded sets the level without a celebration',
    event: { kind: 'level.loaded', at: at(5), level: 7 },
    expected: { level: 7, leveledUpAt: null },
  },
  {
    name: 'typing stamps typingAt and typing.stopped clears it',
    event: { kind: 'typing', at: at(70) },
    expected: { typingAt: at(70) },
  },
  {
    name: 'sending the prompt ends the typing',
    from: { typingAt: at(60) },
    event: { kind: 'typing.stopped', at: at(80) },
    expected: { typingAt: null },
  },
  {
    name: 'compacted stamps compactedAt',
    event: { kind: 'compacted', at: at(40) },
    expected: { compactedAt: at(40) },
  },
  {
    name: 'patted stamps pattedAt',
    event: { kind: 'patted', at: at(50) },
    expected: { pattedAt: at(50) },
  },
  {
    name: 'leveled.up stamps and sets the level',
    event: { kind: 'leveled.up', at: at(60), level: 4 },
    expected: { leveledUpAt: at(60), level: 4 },
  },
  {
    name: 'tick moves only the clock',
    from: { turn: 'thinking' },
    event: { kind: 'tick', at: at(250) },
    expected: { now: at(250), turn: 'thinking' },
  },
  {
    name: 'an older event never moves the clock back',
    from: { now: at(500) },
    event: { kind: 'tick', at: at(100) },
    expected: { now: at(500) },
  },
]

test('reduce: every event kind updates the right fields', () => {
  for (const row of rows) {
    const from: Signals = { ...initialSignals(T0), ...row.from }
    const got = reduce(from, row.event)
    for (const [key, value] of Object.entries(row.expected)) {
      expect(got[key as keyof Signals], `${row.name} → ${key}`).toEqual(value)
    }
  }
})

test('reduce never mutates its input', () => {
  const from = initialSignals(T0)
  const frozen = Object.freeze({ ...from })
  reduce(frozen, { kind: 'turn.started', at: at(1) })
  expect(frozen).toEqual(from)
})

test('toolKindOf maps tool names through one table', () => {
  const table: [string, string][] = [
    ['Read', 'read'], ['Grep', 'read'], ['Glob', 'read'], ['NotebookRead', 'read'],
    ['Edit', 'edit'], ['Write', 'edit'], ['NotebookEdit', 'edit'],
    ['Bash', 'bash'], ['WebFetch', 'other'], ['mcp__x__y', 'other'],
  ]
  for (const [name, kind] of table) expect(toolKindOf(name)).toBe(kind)
})

const agent = (patch: Partial<AgentInfo> = {}): AgentInfo => ({
  id: 'a1', name: 'Explore', startedAt: T0, activeAt: T0, endedAt: null, tool: null, toolsInFlight: 0, lastTool: null, ...patch,
})
const withAgents = (...agents: AgentInfo[]): Signals => ({ ...initialSignals(T0), agents })

test('subagents: started, working, finished and gone', () => {
  let s = reduce(initialSignals(T0), { kind: 'agent.started', at: at(10), id: 'a1', name: 'Explore' })
  expect(s.agents.map(a => [a.id, a.name, a.endedAt])).toEqual([['a1', 'Explore', null]])
  s = reduce(s, { kind: 'agent.tool.started', at: at(20), id: 'a1', tool: 'read' })
  expect([s.agents[0]?.tool, s.agents[0]?.toolsInFlight]).toEqual(['read', 1])
  s = reduce(s, { kind: 'agent.tool.finished', at: at(30), id: 'a1', tool: 'read', failed: true })
  expect([s.agents[0]?.tool, s.agents[0]?.toolsInFlight, s.agents[0]?.lastTool?.failed]).toEqual([null, 0, true])
  s = reduce(s, { kind: 'agent.stopped', at: at(40), id: 'a1' })
  expect(s.agents[0]?.endedAt).toBe(at(40))
  // It lingers for a few seconds, celebrating, then leaves.
  expect(reduce(s, { kind: 'tick', at: at(40 + AGENT_LINGER_MS - 1) }).agents.length).toBe(1)
  expect(reduce(s, { kind: 'tick', at: at(40 + AGENT_LINGER_MS) }).agents.length).toBe(0)
})

test('subagents: a tool call from an unseen agent creates it, a second stop changes nothing', () => {
  let s = reduce(initialSignals(T0), { kind: 'agent.tool.started', at: at(5), id: 'x', tool: 'bash' })
  expect(s.agents[0]?.name).toBe('agent')
  s = reduce(s, { kind: 'agent.stopped', at: at(10), id: 'x' })
  const again = reduce(s, { kind: 'agent.stopped', at: at(900), id: 'x' })
  expect(again.agents[0]?.endedAt).toBe(at(10))
  expect(reduce(initialSignals(T0), { kind: 'agent.stopped', at: at(1), id: 'nobody' }).agents).toEqual([])
})

test('subagents: parallel tools of one agent, a stale agent retired, the cap enforced', () => {
  let s = withAgents(agent({ toolsInFlight: 2, tool: 'read' }))
  s = reduce(s, { kind: 'agent.tool.finished', at: at(10), id: 'a1', tool: 'read', failed: false })
  expect([s.agents[0]?.toolsInFlight, s.agents[0]?.tool]).toEqual([1, 'read'])
  expect(reduce(withAgents(agent()), { kind: 'tick', at: at(AGENT_STALE_MS + 1) }).agents).toEqual([])
  let crowd = initialSignals(T0)
  for (let i = 0; i < MAX_AGENTS + 3; i++) crowd = reduce(crowd, { kind: 'agent.started', at: at(i), id: `a${i}`, name: 'x' })
  expect(crowd.agents.length).toBe(MAX_AGENTS)
  expect(crowd.agents.some(a => a.id === `a${MAX_AGENTS + 2}`)).toBe(true)
})
