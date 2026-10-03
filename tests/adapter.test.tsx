// The adapter through the engine's real hook chain: events in, what Clawd shows out.
// Every operation the plugin calls beneath needs an answer, so `world()` supplies them.
import type { On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

const ONE_MESSAGE = [{ role: 'user' as const, text: 'hello', toolUses: [] }]
const SITE = { bodyColumns: 100, scroll: { offset: 0, bodyRows: 6 }, view: {} } as const
const BAND = { hasSurvey: false, isWorking: false, maxRows: 6, ...SITE } as const

type World = { plays: string[]; clock: ReturnType<typeof mock.clock> }

/** The engine beneath the plugin: usage readings, no panes, a player that records what it plays. */
const world = (on: On, store: Record<string, unknown> = {}): World => {
  const clock = mock.clock(on, { now: 10_000 })
  mock.store(on, store)
  const plays: string[] = []
  on('session.start', () => ({ cwd: '/' }))
  on('command.register', () => ({ value: undefined }) as never)
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200_000, percent: 10, tokens: 20_000 }, rateLimits: [] },
  }))
  on('ui.panes', () => ({ value: [] }))
  on('audio.play', (_$, e) => {
    plays.push(String(e.clip.asset))
    return { value: undefined } as never
  })
  on('turn.start', () => ({ turnId: 't1' }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: 'ok', text: 'ok' }))
  on('classic.Notification', () => ({}))
  on('classic.SubagentStart', () => ({}))
  on('classic.SubagentStop', () => ({}))
  on('prompt.edit', (_$, e) => ({ text: e.text, cursor: e.cursor }))
  on('prompt.submit', (_$, e) => ({ text: e.text }))
  on('session.compact', () => ({ messages: ONE_MESSAGE }))
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  return { plays, clock }
}

const start = ($: Engine) => $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
const finishTurn = ($: Engine, tools: number) =>
  (async () => {
    await $.turn.start({ text: 'go', turnId: 't1' })
    for (let i = 0; i < tools; i++) await $.tool.call({ tool: 'Read', file_path: '/x' })
    await $.turn.complete({ answer: 'ok', durationMs: 5, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  })()

const bandWords = async ($: Engine) => {
  const ui = await $.ui.mount({ plugin: 'clawd', surface: 'desktop', component: 'AbovePrompt', props: BAND, viewport: { columns: 100, rows: 30 } })
  const svg = await ui.find({ type: 'Svg' })
  await ui.unmount()
  return String(svg?.props.alt ?? '')
}

const stats = async ($: Engine) =>
  (
    await $.command.run({
      command: 'clawd',
      args: 'stats',
      origin: { kind: 'composer' },
      presentation: { isFullscreen: false, columns: 100 },
    })
  ).text ?? ''

test('a finished turn earns 10 XP plus 1 per successful tool, and the profile survives a new session', async ($, on) => {
  world(on)
  await start($)
  await finishTurn($, 2)
  expect(await stats($)).toContain('12 XP')
  // A new session reads it back from the store: XP is not lost, and the next turn adds to it.
  await start($)
  expect(await stats($)).toContain('12 XP')
  await finishTurn($, 0)
  expect(await stats($)).toContain('22 XP')
})

test('XP per turn is capped at 30', async ($, on) => {
  world(on)
  await start($)
  await finishTurn($, 50)
  expect(await stats($)).toContain('30 XP')
})

test('a saved profile is never overwritten by defaults, even before session.start ran', async ($, on) => {
  world(on, { profile: { xp: 2500, level: 11, hat: 'crown', muted: true, bandHidden: false } })
  await finishTurn($, 0) // no session.start: the state has no profile yet
  const text = await stats($)
  expect(text).toContain('2510 XP')
  expect(text).toContain('Sounds: muted')
})

test('leveling up shows the new level', async ($, on) => {
  world(on, { profile: { xp: 99 } })
  await start($)
  await finishTurn($, 0) // 109 XP: level 3
  expect(await bandWords($)).toContain('Level 3!')
})

test('an interrupted turn or an error earns nothing and is not celebrated', async ($, on) => {
  world(on)
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.complete({ answer: '', durationMs: 5, isAborted: true, turnId: 't1', reason: 'aborted' } as never)
  expect(await stats($)).toContain('0 XP')
  expect(await bandWords($)).not.toContain('Done!')
})

test('a finished turn says Done', async ($, on) => {
  world(on)
  await start($)
  await finishTurn($, 1)
  expect(await bandWords($)).toContain('Done!')
})

test('sounds: a permission prompt pips once per entry, and never when muted', async ($, on) => {
  const w = world(on)
  await start($)
  const prompt = () => $.classic.Notification({ message: 'needs permission', notification_type: 'permission_prompt' })
  await prompt()
  await prompt() // already waiting: no second pip
  expect(w.plays).toEqual(['sounds/pip.wav'])
  await finishTurn($, 0) // ends the wait
  await prompt()
  expect(w.plays).toEqual(['sounds/pip.wav', 'sounds/pip.wav'])
  await finishTurn($, 0)
  await $.command.run({ command: 'clawd', args: 'mute', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })
  await prompt()
  expect(w.plays.length).toBe(2)
})

test('compaction burps once, with its sound', async ($, on) => {
  const w = world(on)
  await start($)
  await $.session.compact({ trigger: 'manual', messages: ONE_MESSAGE } as never)
  expect(await bandWords($)).toContain('Burp')
  expect(w.plays).toEqual(['sounds/burp.wav'])
})

test('a subagent compaction does not burp', async ($, on) => {
  const w = world(on)
  await start($)
  await $.session.compact({ trigger: 'auto', messages: ONE_MESSAGE, agentId: 'sub1' } as never)
  expect(await bandWords($)).not.toContain('Burp')
  expect(w.plays).toEqual([])
})

test('subagent tool calls and tools outside a turn never move Clawd', async ($, on) => {
  world(on)
  await start($)
  await $.tool.call({ tool: 'Read', file_path: '/x', agentId: 'sub1' } as never)
  expect(await bandWords($)).toContain('Ready')
  await $.tool.call({ tool: 'Read', file_path: '/x' }) // no turn running
  expect(await bandWords($)).toContain('Ready')
})

test('after a minute of quiet Clawd falls asleep', async ($, on) => {
  const w = world(on)
  await start($)
  expect(await bandWords($)).toContain('Ready')
  await w.clock.advance(61_000)
  expect(await bandWords($)).toContain('Zzz')
})

test('the done mark wears off by itself', async ($, on) => {
  const w = world(on)
  await start($)
  await finishTurn($, 0)
  expect(await bandWords($)).toContain('Done!')
  await w.clock.advance(2_500)
  expect(await bandWords($)).toContain('Ready')
})

const edit = ($: Engine, text: string) =>
  (
    $.prompt as unknown as { edit: (input: unknown) => Promise<unknown> }
  ).edit({ origin: { kind: 'composer' }, text, cursor: text.length, start: 0, end: 0, inputText: text })

test('typing in the prompt makes Clawd listen, then he settles', async ($, on) => {
  const w = world(on)
  await start($)
  await edit($, 'h')
  expect(await bandWords($)).toContain('Listening')
  await w.clock.advance(1_600)
  expect(await bandWords($)).toContain('Ready')
})

test('sending the prompt ends the listening at once', async ($, on) => {
  world(on)
  await start($)
  await edit($, 'hello')
  expect(await bandWords($)).toContain('Listening')
  await $.prompt.submit({ text: 'hello', origin: { kind: 'composer' } } as never)
  expect(await bandWords($)).not.toContain('Listening')
})

const subagentStart = ($: Engine, id: string, type: string) =>
  $.classic.SubagentStart({ agent_id: id, agent_type: type } as never)

test('subagents appear in the band with what each is doing, and leave after celebrating', async ($, on) => {
  const w = world(on)
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await subagentStart($, 'a1', 'Explore')
  await subagentStart($, 'a2', 'Plan')
  expect(await bandWords($)).toContain('Directing 2 agents')
  expect(await bandWords($)).toContain('Explore thinking')
  await $.tool.call({ tool: 'Read', file_path: '/x', agentId: 'a1' } as never)
  expect(await bandWords($)).toContain('2 agents working')
  await $.classic.SubagentStop({ agent_id: 'a1', agent_type: 'Explore' } as never)
  expect(await bandWords($)).toContain('2 agents · 1 working')
  expect(await bandWords($)).toContain('Explore done!')
  await w.clock.advance(7_000)
  expect(await bandWords($)).not.toContain('Explore')
  expect(await bandWords($)).toContain('Plan')
})

test('a subagent tool call moves its own Clawd, never the main one', async ($, on) => {
  world(on)
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.tool.call({ tool: 'Bash', command: 'ls', agentId: 'a1' } as never)
  const words = await bandWords($)
  expect(words).toContain('Directing 1 agent')
  expect(words).toContain('agent thinking') // its tool call ended, so it is back to thinking
  expect(words).not.toContain('Running a command')
})

test('subagent XP does not count toward the main agent', async ($, on) => {
  world(on)
  await start($)
  await $.turn.start({ text: 'go', turnId: 't1' })
  for (let i = 0; i < 5; i++) await $.tool.call({ tool: 'Read', file_path: '/x', agentId: 'a1' } as never)
  await $.turn.complete({ answer: 'ok', durationMs: 5, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  expect(await stats($)).toContain('10 XP')
})
