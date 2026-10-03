// Type contract of the clawd plugin: the values it keeps in $.state.
// Shared by hooks/register.tsx and by the pure code under src/.

export type ToolKind = 'read' | 'edit' | 'bash' | 'other'

/** One snapshot of everything Clawd reacts to. States only ever read this. */
export type Signals = {
  /** Milliseconds since the epoch, as of the last event or tick. */
  now: number
  turn: 'idle' | 'thinking' | 'tool'
  tool: ToolKind | null
  /** Main-loop tool calls running right now (read-only tools can run in parallel). */
  toolsInFlight: number
  lastTool: { kind: ToolKind; failed: boolean; at: number } | null
  /** A permission prompt or an AskUserQuestion is open. */
  waitingForUser: boolean
  turnCompletedAt: number | null
  idleSince: number
  /** 0..100: sets Clawd's size (lean, round, stuffed). */
  contextPct: number
  /** Percent of the 5-hour limit used; null off a subscription. Drives the tired states. */
  fiveHourPct: number | null
  compactedAt: number | null
  pattedAt: number | null
  leveledUpAt: number | null
  level: number
  /** The person is typing in the prompt box (set by each edit, cleared on submit). */
  typingAt: number | null
  /** Subagents of the main agent, running or lately finished. */
  agents: AgentInfo[]
}

/** One subagent as Clawd sees it: enough to pick its state and its pose. */
export type AgentInfo = {
  id: string
  /** Its type, such as "Explore"; "agent" when only its tool calls were seen. */
  name: string
  startedAt: number
  /** When it last did something, to retire one that never reported its end. */
  activeAt: number
  endedAt: number | null
  tool: ToolKind | null
  toolsInFlight: number
  lastTool: { kind: ToolKind; failed: boolean; at: number } | null
}

export type HatChoice = 'auto' | 'none' | 'beanie' | 'crown' | 'wizard'

/** What persists across sessions ($.store key `profile`). */
export type Profile = {
  xp: number
  level: number
  hat: HatChoice
  muted: boolean
  bandHidden: boolean
}

export type PaneState = { isOpen: boolean }

declare module 'claude-code' {
  interface PluginState {
    clawd: { signals: Signals; profile: Profile; pane: PaneState }
  }
}
