// State: one Clawd behavior per file. A state owns its trigger, animation, mini face and label.

import type { EyeShape } from '../sprite/frame.ts'
import type { SpriteBuilder } from '../sprite/sprite-builder.ts'
import type { Signals } from './signals.ts'

export interface ClawdState {
  /** Unique kebab-case id, also used in the gallery and tests. */
  id: string
  /** Higher wins when several states match. Use a constant from priorities.ts. */
  priority: number
  /** Pure trigger: true when this state should show for these signals. */
  matches(s: Signals): boolean
  /** Animation: number of frames and milliseconds per frame. */
  frames: number
  frameMs: number
  /** Draw one frame with the builder. Must be pure and deterministic. */
  draw(b: SpriteBuilder, frame: number, s: Signals): void
  /** Mini band: eye shape and a 1-cell badge glyph. */
  mini: { eyes: EyeShape; badge?: string }
  /** One short line for the band, at most 32 chars. */
  label(s: Signals): string
  /** Optional sound when the state is entered. */
  sound?: 'pip' | 'burp'
  /** Transient states end by themselves after this many ms (done, burp, pat, level-up). */
  durationMs?: number
  /** Time the trigger fired, so a transient animation starts at its first frame. */
  since?(s: Signals): number | null
  /** Modifier ids this state animates itself and so opts out of (e.g. burp: 'context-size'). */
  optOut?: readonly string[]
}

export const defineState = (s: ClawdState): ClawdState => Object.freeze(s)

/** True when `at` happened less than `ms` before `now`. */
export const within = (now: number, at: number | null, ms: number): boolean =>
  at !== null && now - at >= 0 && now - at < ms

/** The frame to draw at `now`: from the trigger time for transient states, else a free-running clock. */
export const frameIndex = (state: ClawdState, s: Signals): number => {
  const origin = state.since?.(s) ?? 0
  return Math.floor((s.now - origin) / state.frameMs) % state.frames
}
