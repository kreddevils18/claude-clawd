import { expect, test } from 'claude-code/testing'

import { composeFrame } from '../src/core/compose.ts'
import { applyModifiers } from '../src/core/modifier.ts'
import { allStates } from '../src/core/state-registry.ts'
import { contextSize, fatFor } from '../src/modifiers/context-size.ts'
import { hat } from '../src/modifiers/hat.ts'
import { MODIFIERS } from '../src/modifiers/index.ts'
import {
  XP_TURN_CAP,
  grantXp,
  hatToWear,
  levelFor,
  unlockedHats,
  xpToNextLevel,
} from '../src/progression/xp.ts'
import { bodyBox } from '../src/sprite/body-parts.ts'
import { rasterize } from '../src/sprite/rasterize.ts'
import { sprite } from '../src/sprite/sprite-builder.ts'
import { NEUTRAL, profileWith, signalsAt } from './fixtures.ts'

const lastLayerRows = (frame: ReturnType<ReturnType<typeof sprite>['build']>) => {
  const layer = frame.layers[frame.layers.length - 1]
  if (!layer || layer.kind !== 'dots') throw new Error('expected a dots layer')
  return layer.dots.map(d => d.y)
}

test('context size: 30 / 65 / 90 percent give fat 0 / 1 / 2', () => {
  expect(fatFor(30)).toBe(0)
  expect(fatFor(65)).toBe(1)
  expect(fatFor(90)).toBe(2)
  // Edges: 50 is the first round value, 80 the last, anything above is stuffed.
  expect(fatFor(49.9)).toBe(0)
  expect(fatFor(50)).toBe(1)
  expect(fatFor(80)).toBe(1)
  expect(fatFor(80.1)).toBe(2)
})

test('context size sets fat on the frame, adds cheeks at 1 and a sweat drop at 2', () => {
  const base = sprite().build()
  const lean = contextSize.apply(base, signalsAt({ contextPct: 30 }), profileWith())
  const round = contextSize.apply(base, signalsAt({ contextPct: 65 }), profileWith())
  const stuffed = contextSize.apply(base, signalsAt({ contextPct: 90 }), profileWith())
  expect([lean.body.fat, round.body.fat, stuffed.body.fat]).toEqual([0, 1, 2])
  expect([lean.blush, round.blush, stuffed.blush]).toEqual([false, true, false])
  expect(stuffed.layers.length).toBe(base.layers.length + 1)
  expect(base.body.fat).toBe(0) // input untouched
})

test('a state that opts out of context-size is untouched', () => {
  const burp = allStates().find(s => s.id === 'burp')
  if (!burp) throw new Error('burp missing')
  const signals = signalsAt({ contextPct: 95, compactedAt: NEUTRAL.now - 100 })
  // Burp frame 0 has fat 0 of its own; a 95% context must not override it.
  const frame = composeFrame(burp, signals, profileWith(), 0)
  expect(frame.body.fat).toBe(0)
  const raw = applyModifiers(sprite().build(), signals, profileWith(), MODIFIERS, ['context-size'])
  expect(raw.body.fat).toBe(0)
})

test('the hat sits on the head for fat 0, 1 and 2', () => {
  const profile = profileWith({ xp: 3000, level: 10, hat: 'wizard' })
  for (const fat of [0, 1, 2] as const) {
    const body = sprite().body({ fat }).build()
    const hatted = hat.apply(body, NEUTRAL, profile)
    const rows = lastLayerRows(hatted)
    const { top } = bodyBox(hatted.body)
    expect(Math.max(...rows), `fat ${fat}: hat bottom row rests on the head top`).toBe(top)
    expect(rasterize(hatted).clipped, `fat ${fat}`).toBe(0)
  }
  // Fat 2 puts the head one row higher, and the hat follows.
  const top = (fat: 0 | 2) => Math.max(...lastLayerRows(hat.apply(sprite().body({ fat }).build(), NEUTRAL, profile)))
  expect(top(2)).toBe(top(0) - 1)
})

test('no hat below level 3, none when hidden', () => {
  const body = sprite().build()
  expect(hat.apply(body, NEUTRAL, profileWith({ level: 2 })).layers.length).toBe(0)
  expect(hat.apply(body, NEUTRAL, profileWith({ xp: 3000, level: 10, hat: 'none' })).layers.length).toBe(0)
  expect(hat.apply(body, NEUTRAL, profileWith({ xp: 100, level: 3 })).layers.length).toBe(1)
})

test('xp curve: thresholds and levels', () => {
  const table: [number, number][] = [[0, 1], [24, 1], [25, 2], [99, 2], [100, 3], [224, 3], [225, 4], [624, 5], [625, 6], [2024, 9], [2025, 10]]
  for (const [xp, level] of table) expect(levelFor(xp), `xp ${xp}`).toBe(level)
  expect(xpToNextLevel(0)).toBe(25)
  expect(xpToNextLevel(100)).toBe(125)
})

test('xp per turn is capped', () => {
  expect(XP_TURN_CAP).toBe(30)
  expect(grantXp(0, 10)).toBe(10)
  expect(grantXp(25, 10)).toBe(5)
  expect(grantXp(30, 1)).toBe(0)
  expect(grantXp(100, 1)).toBe(0)
})

test('hats unlock at 3, 6 and 10 and the choice is honoured only when unlocked', () => {
  expect(unlockedHats(2)).toEqual([])
  expect(unlockedHats(3)).toEqual(['beanie'])
  expect(unlockedHats(6)).toEqual(['beanie', 'crown'])
  expect(unlockedHats(10)).toEqual(['beanie', 'crown', 'wizard'])
  expect(hatToWear(profileWith({ level: 6, hat: 'beanie' }))).toBe('beanie')
  expect(hatToWear(profileWith({ level: 6, hat: 'wizard' }))).toBe('crown') // locked pick falls back
  expect(hatToWear(profileWith({ level: 10 }))).toBe('wizard')
  expect(hatToWear(profileWith({ level: 10, hat: 'none' }))).toBe(null)
})
