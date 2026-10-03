// Everything the band says, once, for every surface to draw its own way.

import type { Profile, Signals } from '../../types/index.d.ts'
import { agentScenes, type AgentScene } from '../agents/agent-view.ts'
import type { ClawdState } from '../core/clawd-state.ts'
import type { MiniOutput } from '../sprite/renderers/mini-quadrant-renderer.ts'

/** The band needs room for the 9-cell logo plus a readable line. */
export const MIN_BAND_COLUMNS = 60

export type BandModel = {
  name: string
  level: number
  label: string
  mini: MiniOutput
  agents: AgentScene[]
  /** "3 agents · 2 working", or null with no subagents. */
  agentLine: string | null
  /** One sentence for readers that cannot see the picture. */
  summary: string
}

export const agentLine = (agents: readonly AgentScene[]): string | null => {
  if (agents.length === 0) return null
  const working = agents.filter(a => a.isRunning).length
  const noun = agents.length === 1 ? 'agent' : 'agents'
  return working === agents.length
    ? `${agents.length} ${noun} working`
    : `${agents.length} ${noun} · ${working} working`
}

export const bandModel = (
  state: ClawdState,
  s: Signals,
  profile: Profile,
  mini: MiniOutput,
  now: number,
): BandModel => {
  const agents = agentScenes(s, now)
  const label = state.label(s)
  const line = agentLine(agents)
  const doing = agents.map(a => `${a.name} ${a.label.toLowerCase()}`).join('; ')
  return {
    name: 'Clawd',
    level: profile.level,
    label,
    mini,
    agents,
    agentLine: line,
    summary: `Clawd, level ${profile.level}: ${label}${line ? `. ${line}: ${doing}` : ''}`,
  }
}
