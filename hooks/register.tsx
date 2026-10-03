// Adapter: the only file that talks to Claude Code. Everything under src/ is pure TypeScript.
//
//   Claude Code events ──► emit() ──► Signals in $.state ──► band / pane render hooks
//                                          │
//                                  worthStoring + sound edge
import { atom, read } from 'claude-code'
import type { Elements, EngineInterface, Register, Timer } from 'claude-code'

import type { Profile } from '../types/index.d.ts'
import { hatProblem, parseCommand, statsText, USAGE } from '../src/core/commands.ts'
import { worthStoring } from '../src/core/redraw-policy.ts'
import { reduce } from '../src/core/signal-store.ts'
import { usageEvent } from '../src/core/usage-event.ts'
import {
  initialSignals,
  isAskingTool,
  toolKindOf,
  withDefaults,
  type SignalEvent,
} from '../src/core/signals.ts'
import { selectState } from '../src/core/state-registry.ts'
import { viewAt } from '../src/core/view.ts'
import { DEFAULT_PROFILE, applyTurnXp, parseProfile } from '../src/progression/xp.ts'
import { agentScenes } from '../src/agents/agent-view.ts'
import { bandSvg } from '../src/hud/band-svg.ts'
import { MIN_BAND_COLUMNS, bandModel } from '../src/hud/band-model.ts'
import { paneLines, terminalBand } from '../src/hud/band-terminal.ts'
import type { Span } from '../src/hud/span.ts'
import { meadowSvg } from '../src/scene/meadow-svg.ts'
import { fullRasterRenderer } from '../src/sprite/renderers/full-raster-renderer.ts'
import { miniQuadrantRenderer } from '../src/sprite/renderers/mini-quadrant-renderer.ts'
import { spriteSvg } from '../src/sprite/renderers/svg-renderer.ts'

const SIGNALS = { plugin: 'clawd', key: 'signals' } as const
const PROFILE = { plugin: 'clawd', key: 'profile' } as const
const PANE_STATE = { plugin: 'clawd', key: 'pane' } as const
// Render hooks read through atoms (they subscribe the drawing); each atom spells its reference
// out in full, and the SIGNALS/PROFILE/PANE_STATE consts serve $.state calls only.
const signalsAtom = atom({ plugin: 'clawd', key: 'signals' } as const, initialSignals(0))
const profileAtom = atom({ plugin: 'clawd', key: 'profile' } as const, DEFAULT_PROFILE)
const paneAtom = atom({ plugin: 'clawd', key: 'pane' } as const, { isOpen: false })

const PANE_ID = 'clawd'
const RASTER_KEY = 'clawd'
const TICK_MS = 250
const PANE_COLUMNS = 50
/** Animation steps of the scenery (flowers swaying, hearts rising) advance with this clock. */
const tickOf = (now: number): number => Math.floor(now / TICK_MS)
const PANE_FRAME_MS = 125 // 8 fps, the ceiling for blits
const THEME = { background: 'default' } as const

// Module variables are lost on a hot reload; everything that must survive lives in $.state / $.store.
let paneTimer: Timer | null = null
let lastPanePicture = ''
let lastRemotePicture = ''
let lastBandPicture = ''
let toolsOkThisTurn = 0

/** One row of styled text: the band and the pane both draw their terminal lines this way. */
const spansText = (Text: Elements['terminal']['Text'], spans: readonly Span[]) => (
  <Text>
    {spans.map(span => (
      <Text color={span.color} backgroundColor={span.bg} bold={span.bold} dimColor={span.dim}>
        {span.text}
      </Text>
    ))}
  </Text>
)

/** Reduce one event into the shared snapshot, store it when it matters, play a sound on state entry. */
async function emit($: EngineInterface, event: SignalEvent) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const held = await $.state.get(SIGNALS)
    const prev = withDefaults(held.value, event.at)
    const next = reduce(prev, event)
    if (!worthStoring(prev, next)) return
    const written = await $.state.set(SIGNALS, next, { ifVersion: held.version })
    if (!written.isSet) continue
    const entered = selectState(next)
    if (entered.sound && entered.id !== selectState(prev).id) {
      if (!(await currentProfile($)).muted) {
        // Fire and forget: a missing player must never disturb a turn.
        $.audio.play({ asset: `sounds/${entered.sound}.wav` }).catch(() => undefined)
      }
    }
    return
  }
  $.ui.log(`clawd: dropped a ${event.kind} event after repeated write conflicts`, { to: 'debug' })
}

async function currentProfile($: EngineInterface): Promise<Profile> {
  // Never fall back to defaults: a later save would overwrite the saved profile with them.
  return (await $.state.get(PROFILE)).value ?? parseProfile(await $.store.get('profile'))
}

/** Persist across sessions and tell the drawings. Written on turn.complete and commands only. */
async function saveProfile($: EngineInterface, profile: Profile) {
  await $.store.set('profile', profile)
  await $.state.set(PROFILE, profile)
}

/** One animation step for the open pane: blit on a terminal, redraw on other surfaces. Skips unchanged pictures. */
async function paintPane($: EngineInterface) {
  const stored = (await $.state.get(SIGNALS)).value ?? initialSignals(0)
  const view = viewAt(stored, await currentProfile($), await $.clock.now())
  const surfaces = await $.session.surfaces()
  if (surfaces.includes('terminal')) {
    const picture = fullRasterRenderer.render(view.frame, THEME)
    if (picture.cells !== lastPanePicture) {
      const blitted = await $.ui.blit({ requestId: PANE_ID, key: RASTER_KEY, ...picture })
      if (!blitted.deny) lastPanePicture = picture.cells
    }
  }
  if (surfaces.some(surface => surface !== 'terminal')) {
    const picture = spriteSvg(view.frame, { scale: 8 })
    if (picture !== lastRemotePicture) {
      lastRemotePicture = picture
      $.ui.invalidate('ui.render')
    }
  }
}

/** The band follows the state's animation: ask for a redraw only when the picture really changed. */
async function animateBand($: EngineInterface) {
  const stored = (await $.state.get(SIGNALS)).value ?? initialSignals(0)
  const view = viewAt(stored, await currentProfile($), await $.clock.now())
  const now = await $.clock.now()
  const picture = JSON.stringify([view.frame, agentScenes(view.signals, now).map(a => a.frame), tickOf(now) % 2])
  if (picture === lastBandPicture) return
  lastBandPicture = picture
  $.ui.invalidate('ui.render')
}

function stopPaneLoop() {
  paneTimer?.cancel()
  paneTimer = null
  lastPanePicture = ''
  lastRemotePicture = ''
}

function startPaneLoop($: EngineInterface) {
  stopPaneLoop()
  paneTimer = $.clock.every(PANE_FRAME_MS, () => paintPane($))
}

async function openPane($: EngineInterface) {
  const opened = await $.ui.open({ id: PANE_ID, title: 'Clawd', rows: 11, columns: 52 })
  // A pane that waits undrawn (opened unasked on a narrow terminal) has nothing to animate.
  await $.state.set(PANE_STATE, { isOpen: opened.isPlaced })
  if (opened.isPlaced) startPaneLoop($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // The command and the clock come first: nothing below may keep them from existing.
    await $.command.register({
      name: 'clawd',
      description: 'Open Clawd’s pane, or: pat · hat · mute · hide · stats',
      argumentHint: '[pat|hat <name>|mute|unmute|hide|show|stats]',
    })
    $.clock.every(TICK_MS, async () => {
      await emit($, { kind: 'tick', at: await $.clock.now() })
      await animateBand($)
    })

    const profile = parseProfile(await $.store.get('profile'))
    await $.state.set(PROFILE, profile)
    const now = await $.clock.now()
    await emit($, { kind: 'level.loaded', at: now, level: profile.level })
    try {
      await emit($, usageEvent(now, await $.session.usage()))
    } catch {
      // No reading yet: the first session.measure fills it in.
    }
    // A hot reload runs this again with the pane still open: pick its animation back up.
    const panes = await $.ui.panes()
    const isOpen = panes.some(pane => pane.id === PANE_ID)
    await $.state.set(PANE_STATE, { isOpen })
    if (isOpen) startPaneLoop($)
    return next(e)
  })

  on('session.end', async (_$, e, next) => {
    // /clear ends the session id but not the process or the pane.
    if (e.reason !== 'clear') stopPaneLoop()
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    toolsOkThisTurn = 0
    await emit($, { kind: 'turn.started', at: await $.clock.now() })
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    await emit($, { kind: 'step.started', at: await $.clock.now() })
    return yield* next(e)
  })

  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined) {
      // A subagent's tool call moves that subagent's little Clawd, never the main one.
      const id = e.agentId
      const agentTool = toolKindOf(e.tool)
      await emit($, { kind: 'agent.tool.started', at: await $.clock.now(), id, tool: agentTool })
      let agentFailed = true
      try {
        const ran = await next(e)
        agentFailed = 'isError' in ran && ran.isError === true
        return ran
      } finally {
        await emit($, { kind: 'agent.tool.finished', at: await $.clock.now(), id, tool: agentTool, failed: agentFailed })
      }
    }
    const tool = toolKindOf(e.tool)
    await emit($, { kind: 'tool.started', at: await $.clock.now(), tool })
    if (isAskingTool(e.tool)) {
      await emit($, { kind: 'waiting.changed', at: await $.clock.now(), waiting: true })
    }
    let failed = true
    try {
      const ran = await next(e)
      failed = 'isError' in ran && ran.isError === true
      if ('result' in ran && !failed) toolsOkThisTurn += 1
      return ran
    } finally {
      await emit($, { kind: 'tool.finished', at: await $.clock.now(), tool, failed })
    }
  })

  on('classic.Notification', async ($, e, next) => {
    if (e.notification_type === 'permission_prompt') {
      await emit($, { kind: 'waiting.changed', at: await $.clock.now(), waiting: true })
    }
    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const at = await $.clock.now()
    await emit($, { kind: 'waiting.changed', at, waiting: false })
    await emit($, { kind: 'typing.stopped', at })
    return next(e)
  })

  // The person is typing: Clawd listens. Only the fact is used, never the text.
  on('prompt.edit', async ($, e, next) => {
    await emit($, { kind: 'typing', at: await $.clock.now() })
    return next(e)
  })

  on('classic.SubagentStart', async ($, e, next) => {
    await emit($, { kind: 'agent.started', at: await $.clock.now(), id: e.agent_id, name: e.agent_type })
    return next(e)
  })

  on('classic.SubagentStop', async ($, e, next) => {
    await emit($, { kind: 'agent.stopped', at: await $.clock.now(), id: e.agent_id })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      // A subagent's turn ending is that subagent finishing, not the main agent.
      await emit($, { kind: 'agent.stopped', at: await $.clock.now(), id: e.agentId })
      return next(e)
    }
    const at = await $.clock.now()
    // An interrupted turn, an error or a refusal is not a success to celebrate.
    const succeeded = !e.isAborted && e.reason === 'answer'
    await emit($, { kind: 'turn.completed', at, aborted: !succeeded })
    if (succeeded) {
      const earned = applyTurnXp(await currentProfile($), toolsOkThisTurn)
      await saveProfile($, earned.profile)
      if (earned.leveledUp) {
        await emit($, { kind: 'leveled.up', at, level: earned.profile.level })
      }
    }
    toolsOkThisTurn = 0
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await emit($, usageEvent(await $.clock.now(), e))
    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    const result = await next(e)
    if (!('skip' in result && result.skip) && e.trigger !== 'precompute' && e.agentId === undefined) {
      await emit($, { kind: 'compacted', at: await $.clock.now() })
    }
    return result
  })

  on('command.run', { command: 'clawd' }, async ($, e) => {
    const command = parseCommand(e.args)
    const profile = await currentProfile($)
    switch (command.kind) {
      case 'open':
        await openPane($)
        return { text: 'Clawd is here.' }
      case 'pat':
        await emit($, { kind: 'patted', at: await $.clock.now() })
        return { text: 'You pat Clawd. ♥' }
      case 'hat': {
        const problem = hatProblem(profile, command.hat)
        if (problem) return { text: problem }
        await saveProfile($, { ...profile, hat: command.hat })
        return { text: command.hat === 'none' ? 'Clawd goes bareheaded.' : `Clawd wears: ${command.hat}.` }
      }
      case 'mute':
      case 'unmute':
        await saveProfile($, { ...profile, muted: command.kind === 'mute' })
        return { text: command.kind === 'mute' ? 'Clawd is quiet now.' : 'Sounds are back on.' }
      case 'hide':
      case 'show':
        await saveProfile($, { ...profile, bandHidden: command.kind === 'hide' })
        return { text: command.kind === 'hide' ? 'Band hidden. /clawd show brings it back.' : 'Band shown.' }
      case 'stats':
        return { text: statsText(profile) }
      case 'help':
        return { text: command.problem ? `${command.problem}\n${USAGE}` : USAGE }
    }
  })

  on('ui.close', { id: PANE_ID }, async ($, e, next) => {
    stopPaneLoop()
    await $.state.set(PANE_STATE, { isOpen: false })
    return next(e)
  })

  // Band: Clawd on the left, the subagents' meadow on the right edge. Redraws on a stored change
  // or an animation step.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const profile = await read($, profileAtom)
    const stored = await read($, signalsAtom)
    // The band draws into a box that can be narrower than the window (a docked pane beside it).
    const columns = e.props.bodyColumns ?? e.viewport?.columns ?? MIN_BAND_COLUMNS
    if (e.props.hasSurvey || profile.bandHidden || columns < MIN_BAND_COLUMNS) return next(e)

    const now = await $.clock.now()
    const view = viewAt(stored, profile, now)
    const mini = miniQuadrantRenderer.render(view.frame, THEME)
    const model = bandModel(view.state, view.signals, profile, mini, now)

    if (e.surface === 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      const rows = terminalBand(model, columns, tickOf(now))
      return <Box flexDirection="column">{rows.map(spans => spansText(Text, spans))}</Box>
    }
    if (e.surface === 'desktop' || e.surface === 'vscode' || e.surface === 'mobile') {
      const { Box, Svg } = $.ui.resolve(e)
      const art = bandSvg(model, view.frame, tickOf(now))
      // Clawd on the left, the subagents' meadow pushed to the right edge.
      return (
        <Box flexDirection="row" justifyContent="space-between" alignItems="flex-end">
          <Svg source={art.main} alt={model.summary} />
          {art.meadow !== null && <Svg source={art.meadow} alt={model.summary} />}
        </Box>
      )
    }
    return next(e)
  })

  // Full pane: a raster on the terminal, vector art on surfaces that have Svg.
  on('ui.render', { component: 'Pane', requestId: PANE_ID }, async ($, e, next) => {
    const profile = await read($, profileAtom)
    const stored = await read($, signalsAtom)
    await read($, paneAtom)
    const now = await $.clock.now()
    const view = viewAt(stored, profile, now)
    const mini = miniQuadrantRenderer.render(view.frame, THEME)
    const model = bandModel(view.state, view.signals, profile, mini, now)

    if (e.surface === 'terminal') {
      const { Box, Text, Raster } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          <Raster key={RASTER_KEY} {...fullRasterRenderer.render(view.frame, THEME)} />
          {paneLines(model, PANE_COLUMNS, tickOf(now)).map(spans => spansText(Text, spans))}
        </Box>
      )
    }
    if (e.surface === 'desktop' || e.surface === 'vscode' || e.surface === 'mobile') {
      const { Box, Svg, Text } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          <Svg source={spriteSvg(view.frame, { scale: 8 })} alt={model.summary} />
          <Text bold>{`${model.name} · Lv ${model.level} · ${model.label}`}</Text>
          {model.agents.length > 0 && <Svg source={meadowSvg(model.agents, tickOf(now), model.summary)} alt={model.summary} />}
        </Box>
      )
    }
    return next(e)
  })
}
