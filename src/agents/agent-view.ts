// Subagents as little Clawds: each one's state comes from the same registry as the main agent's,
// fed a snapshot built from what that subagent is doing.

import type { AgentInfo, Signals } from '../../types/index.d.ts'
import type { ClawdState } from '../core/clawd-state.ts'
import { composeFrame } from '../core/compose.ts'
import { initialSignals } from '../core/signals.ts'
import { selectState } from '../core/state-registry.ts'
import { DEFAULT_PROFILE } from '../progression/xp.ts'
import type { Frame } from '../sprite/frame.ts'
import { miniQuadrantRenderer, type MiniOutput } from '../sprite/renderers/mini-quadrant-renderer.ts'

/** The snapshot one subagent's state is chosen from. */
export const agentSignals = (a: AgentInfo, now: number): Signals => ({
  ...initialSignals(now),
  turn: a.endedAt !== null ? 'idle' : a.toolsInFlight > 0 ? 'tool' : 'thinking',
  tool: a.toolsInFlight > 0 ? a.tool : null,
  toolsInFlight: a.toolsInFlight,
  lastTool: a.lastTool,
  turnCompletedAt: a.endedAt,
  idleSince: a.endedAt ?? a.startedAt,
})

export type AgentScene = {
  id: string
  name: string
  state: ClawdState
  frame: Frame
  mini: MiniOutput
  /** What it is doing, in a few words, for tooltips and alt text. */
  label: string
  /** Still working (not just lingering after its end). */
  isRunning: boolean
}

/** The subagents to draw, oldest first, each posed for its own state. */
export const agentScenes = (s: Signals, now: number): AgentScene[] =>
  s.agents.map(a => {
    const signals = agentSignals(a, now)
    const state = selectState(signals)
    const frame = composeFrame(state, signals, DEFAULT_PROFILE)
    return {
      id: a.id,
      name: a.name,
      state,
      frame,
      mini: miniQuadrantRenderer.render(frame, { background: 'default' }),
      label: state.label(signals),
      isRunning: a.endedAt === null,
    }
  })
