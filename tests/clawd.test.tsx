// End to end through the engine's own host: the plugin's hooks draw the band and the pane on
// every surface, and /clawd answers. Written once, looped over surfaces.
import type { On } from 'claude-code'
import { expect, mock, test, type Engine } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const

const SITE = { bodyColumns: 100, scroll: { offset: 0, bodyRows: 6 }, view: {} } as const
const BAND_PROPS = { hasSurvey: false as boolean, isWorking: false, maxRows: 6, ...SITE }
const PANE_PROPS = { title: 'Clawd', isFocused: false, placement: 'inline', ...SITE } as const

/** What the engine itself draws when the plugin steps aside: nothing. */
const engineDrawsNothing = (on: On) =>
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })

type Finder = { findAll: (query: { type: string }) => Promise<{ text: string; props: Record<string, unknown> }[]> }

/** Everything a drawing says, as words: the terminal's text, or the source of its vector art. */
const sayings = async (ui: Finder, _surface: 'terminal' | 'desktop'): Promise<string> => {
  const texts = (await ui.findAll({ type: 'Text' })).map(el => el.text)
  const svgs = (await ui.findAll({ type: 'Svg' })).map(el => String(el.props.source))
  return [...texts, ...svgs].join('')
}

const mountBand = ($: Engine, surface: 'terminal' | 'desktop', columns = 100, props = BAND_PROPS) =>
  $.ui.mount({
    plugin: 'clawd',
    surface,
    component: 'AbovePrompt',
    props: { ...props, bodyColumns: columns },
    viewport: { columns, rows: 30 },
  })

const bandSays = async ($: Engine, surface: 'terminal' | 'desktop') => {
  const ui = await mountBand($, surface)
  const words = await sayings(ui, surface)
  await ui.unmount()
  return words
}

test('the band draws Clawd, a label and the meters on every surface', async ($, on) => {
  mock.clock(on, { now: 10_000 })
  for (const surface of SURFACES) {
    const words = await bandSays($, surface)
    expect(words, surface).toContain('Clawd')
    expect(words, surface).toContain('Lv 1')
    expect(words, surface).toContain('Ready')
  }
})

test('the terminal band shows the logo', async ($, on) => {
  mock.clock(on, { now: 10_000 })
  const ui = await mountBand($, 'terminal')
  const words = (await ui.findAll({ type: 'Text' })).map(el => el.text).join('')
  expect(words).toContain('▐▛███▜▌')
  expect(words).toContain('▝▜█████▛▘')
  expect(words).toContain('▘▘ ▝▝')
  await ui.unmount()
})

test('the desktop band is vector art with the same words in its alt text', async ($, on) => {
  mock.clock(on, { now: 10_000 })
  const ui = await mountBand($, 'desktop')
  const svg = await ui.find({ type: 'Svg' })
  expect(svg).toBeDefined()
  expect(String(svg?.props.alt)).toContain('Clawd, level 1: Ready')
  expect(String(svg?.props.source).startsWith('<svg ')).toBe(true)
  await ui.unmount()
})

test('the band hides under 60 columns and during a survey', async ($, on) => {
  mock.clock(on, { now: 10_000 })
  engineDrawsNothing(on)
  for (const surface of SURFACES) {
    const narrow = await mountBand($, surface, 59)
    expect(await sayings(narrow, surface), `${surface} narrow`).not.toContain('Clawd')
    await narrow.unmount()
    const survey = await mountBand($, surface, 100, { ...BAND_PROPS, hasSurvey: true })
    expect(await sayings(survey, surface), `${surface} survey`).not.toContain('Clawd')
    await survey.unmount()
  }
})

test('the pane draws a Raster on the terminal and vector art elsewhere', async ($, on) => {
  mock.clock(on, { now: 10_000 })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({
      plugin: 'clawd',
      surface,
      component: 'Pane',
      requestId: 'clawd',
      props: PANE_PROPS,
      viewport: { columns: 80, rows: 30 },
    })
    expect(await sayings(ui, surface), surface).toContain('Clawd')
    const raster = await ui.find({ type: 'Raster' })
    if (surface === 'terminal') expect(raster, 'terminal draws a Raster').toBeDefined()
    else expect(raster, `${surface} has no Raster`).toBeUndefined()
    if (surface === 'desktop') expect((await ui.findAll({ type: 'Svg' })).length, 'just the picture, no subagents').toBe(1)
    await ui.unmount()
  }
})

test('/clawd answers each option', async ($, on) => {
  mock.clock(on, { now: 10_000 })
  mock.store(on)
  const run = async (args: string) =>
    (
      await $.command.run({
        command: 'clawd',
        args,
        origin: { kind: 'composer' },
        presentation: { isFullscreen: false, columns: 100 },
      })
    ).text ?? ''

  expect(await run('stats')).toContain('Lv 1')
  expect(await run('hat crown')).toContain('unlocks at Lv 6')
  expect(await run('hat none')).toContain('bareheaded')
  expect(await run('mute')).toContain('quiet')
  expect(await run('stats')).toContain('Sounds: muted')
  expect(await run('unmute')).toContain('back on')
  expect(await run('hide')).toContain('hidden')
  expect(await run('show')).toContain('shown')
  expect(await run('pat')).toContain('pat')
  expect(await run('hat')).toContain('Pick a hat')
  expect(await run('dance')).toContain('Unknown option')
})

test('a failing tool call makes Clawd show the failure', async ($, on) => {
  mock.clock(on, { now: 10_000 })
  on('tool.call', { tool: 'Bash' }, () => ({ result: 'boom', isError: true, text: 'boom' }))
  await $.tool.call({ tool: 'Bash', command: 'false' })
  for (const surface of SURFACES) expect(await bandSays($, surface)).toContain('That did not work')
})

test('a permission prompt makes Clawd wait for you', async ($, on) => {
  mock.clock(on, { now: 10_000 })
  on('classic.Notification', () => ({}))
  await $.classic.Notification({ message: 'Claude needs your permission', notification_type: 'permission_prompt' })
  for (const surface of SURFACES) expect(await bandSays($, surface)).toContain('Waiting for you')
})
