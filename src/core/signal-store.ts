// Observer: a pure reducer. The adapter feeds events in; states read the result.

import {
  AGENT_LINGER_MS,
  AGENT_STALE_MS,
  MAX_AGENTS,
  type AgentInfo,
  type SignalEvent,
  type Signals,
} from './signals.ts'

const clampPct = (n: number): number => Math.max(0, Math.min(100, n))

const newAgent = (id: string, name: string, at: number): AgentInfo => ({
  id,
  name,
  startedAt: at,
  activeAt: at,
  endedAt: null,
  tool: null,
  toolsInFlight: 0,
  lastTool: null,
})

/** Change one subagent, creating it first when only its tool calls were seen. */
const withAgent = (agents: AgentInfo[], id: string, at: number, change: (a: AgentInfo) => AgentInfo): AgentInfo[] => {
  const known = agents.some(a => a.id === id)
  const list = known ? agents : [...agents, newAgent(id, 'agent', at)]
  const updated = list.map(a => (a.id === id ? { ...change(a), activeAt: at } : a))
  if (updated.length <= MAX_AGENTS) return updated
  // Make room: drop the oldest finished agent, else the oldest.
  const victim = updated.find(a => a.endedAt !== null) ?? updated[0]
  return updated.filter(a => a !== victim)
}

/** Finished agents leave after a while; one that went silent without ending is retired too. */
const retire = (agents: AgentInfo[], now: number): AgentInfo[] => {
  const kept = agents.filter(a =>
    a.endedAt !== null ? now - a.endedAt < AGENT_LINGER_MS : now - a.activeAt < AGENT_STALE_MS,
  )
  return kept.length === agents.length ? agents : kept
}

export const reduce = (s: Signals, e: SignalEvent): Signals => {
  const now = Math.max(s.now, e.at)
  const base: Signals = { ...s, now, agents: retire(s.agents, now) }
  switch (e.kind) {
    case 'turn.started':
      return { ...base, turn: 'thinking', tool: null, toolsInFlight: 0, turnCompletedAt: null }
    case 'step.started':
      return base.turn === 'idle' ? base : { ...base, turn: 'thinking', tool: null }
    case 'tool.started':
      // Tool calls outside a turn (background runs) are counted but never move Clawd.
      return {
        ...base,
        toolsInFlight: base.toolsInFlight + 1,
        ...(base.turn === 'idle' ? {} : { turn: 'tool' as const, tool: e.tool }),
      }
    case 'tool.finished': {
      const inFlight = Math.max(0, base.toolsInFlight - 1)
      return {
        ...base,
        toolsInFlight: inFlight,
        // Parallel tools: stay on "tool" until the last one ends; a live wait outlasts its siblings.
        ...(base.turn === 'idle' ? {} : { turn: inFlight > 0 ? ('tool' as const) : ('thinking' as const) }),
        tool: base.turn !== 'idle' && inFlight > 0 ? base.tool : null,
        waitingForUser: inFlight > 0 ? base.waitingForUser : false,
        lastTool: { kind: e.tool, failed: e.failed, at: e.at },
      }
    }
    case 'waiting.changed':
      return { ...base, waitingForUser: e.waiting }
    case 'turn.completed':
      return {
        ...base,
        turn: 'idle',
        tool: null,
        toolsInFlight: 0,
        waitingForUser: false,
        turnCompletedAt: e.aborted === true ? base.turnCompletedAt : e.at,
        idleSince: e.at,
      }
    case 'usage.measured':
      return {
        ...base,
        contextPct: clampPct(e.contextPct),
        fiveHourPct: e.fiveHourPct === null ? null : Math.max(0, e.fiveHourPct),
      }
    case 'compacted':
      return { ...base, compactedAt: e.at }
    case 'patted':
      return { ...base, pattedAt: e.at }
    case 'leveled.up':
      return { ...base, leveledUpAt: e.at, level: e.level }
    case 'level.loaded':
      return { ...base, level: e.level }
    case 'typing':
      return { ...base, typingAt: e.at }
    case 'typing.stopped':
      return { ...base, typingAt: null }
    case 'agent.started':
      return {
        ...base,
        agents: withAgent(
          base.agents.filter(a => a.id !== e.id),
          e.id,
          e.at,
          () => newAgent(e.id, e.name, e.at),
        ),
      }
    case 'agent.tool.started':
      return {
        ...base,
        agents: withAgent(base.agents, e.id, e.at, a => ({
          ...a,
          tool: e.tool,
          toolsInFlight: a.toolsInFlight + 1,
        })),
      }
    case 'agent.tool.finished':
      return {
        ...base,
        agents: withAgent(base.agents, e.id, e.at, a => {
          const inFlight = Math.max(0, a.toolsInFlight - 1)
          return {
            ...a,
            toolsInFlight: inFlight,
            tool: inFlight > 0 ? a.tool : null,
            lastTool: { kind: e.tool, failed: e.failed, at: e.at },
          }
        }),
      }
    case 'agent.stopped':
      return base.agents.some(a => a.id === e.id && a.endedAt === null)
        ? {
            ...base,
            agents: withAgent(base.agents, e.id, e.at, a => ({ ...a, endedAt: e.at, tool: null, toolsInFlight: 0 })),
          }
        : base
    case 'tick':
      return base
  }
}

/** True when two snapshots differ in anything but the clock: used to skip redraws. */
export const differsBeyondClock = (a: Signals, b: Signals): boolean => {
  const { now: _a, ...restA } = a
  const { now: _b, ...restB } = b
  return JSON.stringify(restA) !== JSON.stringify(restB)
}
