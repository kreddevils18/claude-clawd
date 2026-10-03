// Runs over EVERY registered state, so a new state is covered without writing a test.
import { expect, test } from 'claude-code/testing'

import { frameIndex } from '../src/core/clawd-state.ts'
import { composeFrame } from '../src/core/compose.ts'
import { allStates } from '../src/core/state-registry.ts'
import { rasterize } from '../src/sprite/rasterize.ts'
import { miniQuadrantRenderer } from '../src/sprite/renderers/mini-quadrant-renderer.ts'
import { EXTREME, MAX_PROFILE, NEUTRAL, profileWith, signalsAt, T0 } from './fixtures.ts'

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
const PROFILES = [profileWith(), MAX_PROFILE, profileWith({ xp: 700, level: 6 })]
const CONTEXTS = [0, 30, 65, 95, 100]

test('at least the 14 shipped states are registered', () => {
  expect(allStates().length >= 14).toBe(true)
})

test('ids are unique kebab-case and priorities are unique', () => {
  const states = allStates()
  const ids = states.map(s => s.id)
  const priorities = states.map(s => s.priority)
  for (const id of ids) expect(KEBAB.test(id), `id ${id}`).toBe(true)
  expect(new Set(ids).size, 'duplicate id').toBe(ids.length)
  expect(new Set(priorities).size, 'duplicate priority').toBe(priorities.length)
})

test('idle always matches', () => {
  const idle = allStates().find(s => s.id === 'idle')
  expect(idle !== undefined).toBe(true)
  for (const s of [NEUTRAL, EXTREME, signalsAt({ turn: 'thinking' })]) expect(idle?.matches(s)).toBe(true)
})

test('every state animates sanely and transient ones know when they started', () => {
  for (const state of allStates()) {
    expect(state.frames >= 1, `${state.id} frames`).toBe(true)
    expect(state.frameMs >= 100, `${state.id} frameMs (≤ 10 fps)`).toBe(true)
    if (state.durationMs !== undefined) {
      expect(typeof state.since, `${state.id} needs since()`).toBe('function')
    }
  }
})

test('draw never throws and never leaves the 50×16 canvas, for every frame', () => {
  for (const state of allStates()) {
    for (const signals of [NEUTRAL, EXTREME, signalsAt({ contextPct: 55, level: 4, fiveHourPct: 90 })]) {
      for (const profile of PROFILES) {
        for (let f = 0; f < state.frames; f++) {
          for (const contextPct of CONTEXTS) {
            const frame = composeFrame(state, { ...signals, contextPct }, profile, f)
            const { clipped } = rasterize(frame)
            expect(clipped, `${state.id} frame ${f} ctx ${contextPct} lvl ${profile.level}`).toBe(0)
          }
        }
      }
    }
  }
})

test('draw is deterministic: same signals and frame, same picture', () => {
  for (const state of allStates()) {
    for (let f = 0; f < state.frames; f++) {
      const a = composeFrame(state, EXTREME, MAX_PROFILE, f)
      const b = composeFrame(state, EXTREME, MAX_PROFILE, f)
      expect(JSON.stringify(a), `${state.id} frame ${f}`).toBe(JSON.stringify(b))
    }
  }
})

test('labels fit the band and badges are exactly one cell', () => {
  for (const state of allStates()) {
    for (const signals of [NEUTRAL, EXTREME, signalsAt({ fiveHourPct: 100, level: 100 })]) {
      expect([...state.label(signals)].length <= 32, `${state.id} label "${state.label(signals)}"`).toBe(true)
      expect(state.label(signals).length > 0).toBe(true)
    }
    if (state.mini.badge !== undefined) {
      expect([...state.mini.badge].length, `${state.id} badge`).toBe(1)
    }
  }
})

test('the mini renderer draws every state in 9×3 plus its badge', () => {
  for (const state of allStates()) {
    const frame = composeFrame(state, EXTREME, MAX_PROFILE, 0)
    const out = miniQuadrantRenderer.render(frame, { background: 'default' })
    expect(out.glyphs.length).toBe(3)
    for (const line of out.glyphs) expect([...line].length, state.id).toBe(9)
    expect(out.badge).toBe(state.mini.badge ?? '')
  }
})

test('frameIndex starts transient states at frame 0 and stays in range', () => {
  for (const state of allStates()) {
    const s = signalsAt({
      now: T0,
      turnCompletedAt: T0,
      compactedAt: T0,
      pattedAt: T0,
      leveledUpAt: T0,
      lastTool: { kind: 'bash', failed: true, at: T0 },
    })
    if (state.durationMs !== undefined) expect(frameIndex(state, s), `${state.id} starts at 0`).toBe(0)
    for (let ms = 0; ms < 5000; ms += 137) {
      const f = frameIndex(state, { ...s, now: T0 + ms })
      expect(f >= 0 && f < state.frames, `${state.id} @${ms}`).toBe(true)
    }
  }
})
