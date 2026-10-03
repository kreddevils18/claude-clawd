// Signals: the one snapshot Clawd's states read, and the events that change it.
// Pure TypeScript: no Claude Code imports, no clock, no I/O.

import type { AgentInfo, Signals, ToolKind } from '../../types/index.d.ts'

export type { AgentInfo, Signals, ToolKind }

/** A finished subagent stays in the meadow this long, celebrating, before it leaves. */
export const AGENT_LINGER_MS = 6000
/** A subagent that never reported its end is retired after this long without activity. */
export const AGENT_STALE_MS = 180_000
/** The most subagents tracked at once; the oldest finished one makes room. */
export const MAX_AGENTS = 8

/** Every event carries `at`, the time it happened, so reducing stays pure. */
export type SignalEvent =
  | { kind: 'turn.started'; at: number }
  | { kind: 'step.started'; at: number }
  | { kind: 'tool.started'; at: number; tool: ToolKind }
  | { kind: 'tool.finished'; at: number; tool: ToolKind; failed: boolean }
  | { kind: 'waiting.changed'; at: number; waiting: boolean }
  /** An interrupted turn goes idle quietly: no "done" celebration. */
  | { kind: 'turn.completed'; at: number; aborted?: boolean }
  | { kind: 'usage.measured'; at: number; contextPct: number; fiveHourPct: number | null }
  | { kind: 'compacted'; at: number }
  | { kind: 'patted'; at: number }
  | { kind: 'leveled.up'; at: number; level: number }
  /** The saved profile was read at session start: sets the level without a celebration. */
  | { kind: 'level.loaded'; at: number; level: number }
  /** The person edited the prompt box, or sent it (which ends the typing). */
  | { kind: 'typing'; at: number }
  | { kind: 'typing.stopped'; at: number }
  | { kind: 'agent.started'; at: number; id: string; name: string }
  | { kind: 'agent.tool.started'; at: number; id: string; tool: ToolKind }
  | { kind: 'agent.tool.finished'; at: number; id: string; tool: ToolKind; failed: boolean }
  | { kind: 'agent.stopped'; at: number; id: string }
  | { kind: 'tick'; at: number }

export const initialSignals = (now: number, level = 1): Signals => ({
  now,
  turn: 'idle',
  tool: null,
  toolsInFlight: 0,
  lastTool: null,
  waitingForUser: false,
  turnCompletedAt: null,
  idleSince: now,
  contextPct: 0,
  fiveHourPct: null,
  compactedAt: null,
  pattedAt: null,
  leveledUpAt: null,
  level,
  typingAt: null,
  agents: [],
})

/**
 * A stored snapshot may come from an older version (state outlives a hot reload), so any field it
 * lacks takes its starting value. Read every snapshot through this before using it.
 */
export const withDefaults = (stored: Partial<Signals> | null | undefined, now: number): Signals => ({
  ...initialSignals(now),
  ...stored,
})

/** Subagents still working. */
export const agentsRunning = (s: Signals): number => s.agents.filter(a => a.endedAt === null).length

/** The one table that maps Claude Code tool names to what Clawd does. */
const TOOL_KIND_BY_NAME: Readonly<Record<string, ToolKind>> = Object.freeze({
  Read: 'read',
  Grep: 'read',
  Glob: 'read',
  NotebookRead: 'read',
  Edit: 'edit',
  Write: 'edit',
  NotebookEdit: 'edit',
  Bash: 'bash',
})

export const toolKindOf = (name: string): ToolKind => TOOL_KIND_BY_NAME[name] ?? 'other'

/** Tools whose call means the model is asking the person something. */
export const isAskingTool = (name: string): boolean => name === 'AskUserQuestion'
