import { expect, test } from 'claude-code/testing'

import { agentScenes, agentSignals } from '../src/agents/agent-view.ts'
import { agentsRunning, initialSignals, withDefaults } from '../src/core/signals.ts'
import { reduce } from '../src/core/signal-store.ts'
import { viewAt } from '../src/core/view.ts'
import { selectState } from '../src/core/state-registry.ts'
import { bandSvg } from '../src/hud/band-svg.ts'
import { agentLine, bandModel } from '../src/hud/band-model.ts'
import { paneLines, terminalBand } from '../src/hud/band-terminal.ts'
import { merge, width } from '../src/hud/span.ts'
import { meadowSvg } from '../src/scene/meadow-svg.ts'
import { agentsThatFit, meadowRows, meadowWidth, MEADOW_ROWS } from '../src/scene/meadow-terminal.ts'
import { composeFrame } from '../src/core/compose.ts'
import { miniQuadrantRenderer } from '../src/sprite/renderers/mini-quadrant-renderer.ts'
import { EXTREME, NEUTRAL, profileWith, signalsAt, T0 } from './fixtures.ts'
import type { AgentInfo } from '../types/index.d.ts'

const agent = (patch: Partial<AgentInfo> = {}): AgentInfo => ({
  id: 'a1', name: 'Explore', startedAt: T0 - 3000, activeAt: T0, endedAt: null, tool: null, toolsInFlight: 0, lastTool: null, ...patch,
})

const modelFor = (agents: AgentInfo[], columns = 120) => {
  const s = signalsAt({ agents, turn: 'thinking' })
  const state = selectState(s)
  const mini = miniQuadrantRenderer.render(composeFrame(state, s, profileWith(), 0), { background: 'default' })
  return bandModel(state, s, profileWith(), mini, T0)
}

test('each subagent takes the state of what it is doing', () => {
  const stateOf = (a: AgentInfo) => selectState(agentSignals(a, T0)).id
  expect(stateOf(agent())).toBe('think')
  expect(stateOf(agent({ toolsInFlight: 1, tool: 'read' }))).toBe('read')
  expect(stateOf(agent({ toolsInFlight: 1, tool: 'edit' }))).toBe('edit')
  expect(stateOf(agent({ toolsInFlight: 1, tool: 'bash' }))).toBe('bash')
  expect(stateOf(agent({ lastTool: { kind: 'bash', failed: true, at: T0 - 500 } }))).toBe('fail')
  expect(stateOf(agent({ endedAt: T0 - 500 }))).toBe('done')
  expect(stateOf(agent({ endedAt: T0 - 3000 }))).toBe('idle')
})

test('agentScenes poses every subagent and marks who is still working', () => {
  const scenes = agentScenes(EXTREME, T0)
  expect(scenes.map(a => [a.id, a.isRunning])).toEqual([['a1', true], ['a2', false]])
  expect(scenes[0]?.state.id).toBe('read')
  expect(scenes[1]?.state.id).toBe('fail')
  for (const scene of scenes) expect(scene.mini.glyphs.every(g => [...g].length === 9)).toBe(true)
  expect(agentScenes(NEUTRAL, T0)).toEqual([])
})

test('the main agent directs while subagents run', () => {
  const s = signalsAt({ turn: 'thinking', agents: [agent(), agent({ id: 'b' })] })
  expect(agentsRunning(s)).toBe(2)
  expect(selectState(s).label(s)).toBe('Directing 2 agents…')
  const one = signalsAt({ turn: 'thinking', agents: [agent()] })
  expect(selectState(one).label(one)).toBe('Directing 1 agent…')
  expect(selectState(signalsAt({ turn: 'thinking' })).label(signalsAt({ turn: 'thinking' }))).toBe('Thinking…')
  expect(agentsRunning(signalsAt({ agents: [agent({ endedAt: T0 })] }))).toBe(0)
})

test('the agent line counts working and lingering agents', () => {
  const scenes = (...a: AgentInfo[]) => agentScenes(signalsAt({ agents: a }), T0)
  expect(agentLine([])).toBe(null)
  expect(agentLine(scenes(agent()))).toBe('1 agent working')
  expect(agentLine(scenes(agent(), agent({ id: 'b' })))).toBe('2 agents working')
  expect(agentLine(scenes(agent(), agent({ id: 'b', endedAt: T0 })))).toBe('2 agents · 1 working')
})

test('the terminal meadow is three rows wide enough for its agents, full of flowers', () => {
  const scenes = agentScenes(signalsAt({ agents: [agent(), agent({ id: 'b', toolsInFlight: 1, tool: 'bash' })] }), T0)
  expect(meadowWidth(0)).toBe(0)
  expect(meadowWidth(2)).toBe(22)
  const rows = meadowRows(scenes, 0)
  expect(rows.length).toBe(MEADOW_ROWS)
  for (const row of rows) expect(width(row)).toBe(22)
  const ground = rows[2]?.map(s => s.text).join('') ?? ''
  expect(/[✿❀✾❁]/.test(ground)).toBe(true)
  expect(rows[2]?.every(s => s.bg !== undefined)).toBe(true)
  // The little Clawds stand in it, in the body color.
  expect(rows[0]?.some(s => s.color === '#d97757' && s.text.includes('▐'))).toBe(true)
  // Neighbors send each other hearts.
  expect(rows.flat().some(s => s.text.includes('♥'))).toBe(true)
  // The field sways: a later tick draws a different field, the same size.
  expect(JSON.stringify(meadowRows(scenes, 2)) === JSON.stringify(rows)).toBe(false)
  // Deterministic: the same tick draws the same field.
  expect(JSON.stringify(meadowRows(scenes, 3))).toBe(JSON.stringify(meadowRows(scenes, 3)))
  expect(agentsThatFit(21)).toBe(1)
  expect(agentsThatFit(22)).toBe(2)
  expect(agentsThatFit(5)).toBe(0)
})

test('spans merge neighbors of one style only', () => {
  expect(merge([{ text: 'a' }, { text: 'b' }, { text: 'c', dim: true }, { text: 'd', dim: true }, { text: 'e' }]).map(s => s.text)).toEqual(['ab', 'cd', 'e'])
})

test('the terminal band keeps the meadow on the right edge at every width', () => {
  const m = modelFor([agent(), agent({ id: 'b' }), agent({ id: 'c' })])
  for (const columns of [60, 80, 100, 140, 200]) {
    const rows = terminalBand(m, columns, 0)
    expect(rows.length).toBe(3)
    for (const row of rows) expect(width(row) <= columns - 1, `${columns} cols: row is ${width(row)}`).toBe(true)
    const shown = Math.min(3, agentsThatFit(Math.max(0, columns - 1 - 9 - 2 - 33 - 2)))
    if (shown > 0) {
      // Rows end at the same column: the meadow hugs the right edge.
      expect(new Set(rows.map(width)).size, `${columns} cols aligned`).toBe(1)
      expect(width(rows[0] ?? [])).toBe(columns - 1)
    }
  }
  // Too narrow for any: no meadow, but the count still shows.
  const narrow = terminalBand(m, 60, 0)
  expect(narrow[1]?.map(s => s.text).join('')).toContain('3 agents')
})

test('with no subagents the band is just Clawd and his words', () => {
  const m = modelFor([])
  const rows = terminalBand(m, 120, 0)
  expect(rows[0]?.map(s => s.text).join('')).toContain('Clawd · Lv 1')
  expect(width(rows[0] ?? []) < 60).toBe(true)
  expect(paneLines(m, 50, 0).length).toBe(1)
})

test('the pane lists the meadow under the picture', () => {
  const m = modelFor([agent(), agent({ id: 'b' })])
  const lines = paneLines(m, 50, 0)
  expect(lines.length).toBe(1 + 1 + MEADOW_ROWS)
  expect(lines[1]?.map(s => s.text).join('')).toContain('2 agents')
})

test('the vector band and meadow are well formed and carry what the agents do', () => {
  const m = modelFor([agent({ toolsInFlight: 1, tool: 'edit', name: 'Fix <it>' }), agent({ id: 'b' }), agent({ id: 'c', endedAt: T0 - 100 })])
  const s = signalsAt({ turn: 'thinking' })
  const frame = composeFrame(selectState(s), s, profileWith(), 0)
  const art = bandSvg(m, frame, 7)
  const svg = art.main + (art.meadow ?? '')
  expect(art.main.startsWith('<svg ')).toBe(true)
  expect(art.main.endsWith('</svg>')).toBe(true)
  expect(art.meadow?.startsWith('<svg ')).toBe(true)
  expect(art.meadow?.endsWith('</svg>')).toBe(true)
  expect(svg).not.toContain('NaN')
  expect(svg).not.toContain('undefined')
  expect(svg).toContain('Directing')
  expect(svg).toContain('Fix &lt;it&gt;: Editing…')
  expect(svg).not.toContain('<it>')
  const widthOf = (markup: string | null) => Number(/^<svg[^>]* width="(\d+)"/.exec(markup ?? '')?.[1])
  expect(widthOf(art.main) > 200 && widthOf(art.main) < 700, `main width ${widthOf(art.main)}`).toBe(true)
  expect(widthOf(art.meadow) > 100 && widthOf(art.meadow) < 600, `meadow width ${widthOf(art.meadow)}`).toBe(true)
  // Flowers of several colors, and a heart between neighbors.
  for (const color of ['#f27ea9', '#f6c945']) expect(svg).toContain(color)
  expect(meadowSvg(m.agents, 3, m.summary)).toContain('role="img"')
  expect(meadowSvg(m.agents, 3, m.summary)).not.toContain('NaN')
  // No subagents: no meadow.
  const plain = bandSvg(modelFor([]), frame, 0)
  expect(plain.meadow).toBe(null)
  expect(plain.main).not.toContain('#9fd8f0')
})

test('a snapshot stored by an older version is completed, not crashed on', () => {
  // State outlives a hot reload: this is what a version without subagents or typing stored.
  const legacy = { now: T0, turn: 'idle', tool: null, lastTool: null, waitingForUser: false, turnCompletedAt: null, idleSince: T0, contextPct: 20, fiveHourPct: null, compactedAt: null, pattedAt: null, leveledUpAt: null, level: 2 }
  const complete = withDefaults(legacy as never, T0)
  expect(complete.agents).toEqual([])
  expect(complete.typingAt).toBe(null)
  expect(complete.toolsInFlight).toBe(0)
  expect(complete.level).toBe(2)
  expect(complete.contextPct).toBe(20)
  const view = viewAt(legacy as never, profileWith(), T0 + 10)
  expect(view.state.id).toBe('idle')
  expect(reduce(complete, { kind: 'agent.started', at: T0, id: 'a', name: 'x' }).agents.length).toBe(1)
  expect(withDefaults(undefined, T0)).toEqual(initialSignals(T0))
})
