// Renders docs/clawd.gif: every state animating side by side, in priority order (the gallery's
// order). Drawn straight from the sprite engine, not a screen recording. Needs ffmpeg.
//   node --experimental-strip-types scripts/build-gif.ts

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { composeFrame } from '../src/core/compose.ts'
import { initialSignals } from '../src/core/signals.ts'
import { allStates } from '../src/core/state-registry.ts'
import { DEFAULT_PROFILE } from '../src/progression/xp.ts'
import { CANVAS_H, CANVAS_W } from '../src/sprite/frame.ts'
import { rasterize } from '../src/sprite/rasterize.ts'

const OUT = fileURLToPath(new URL('../docs/clawd.gif', import.meta.url))
const SCALE = 4
const COLUMNS = 4
const GAP = 8
const BACKGROUND = 0x1b1713
const STEP_MS = 125
const STEPS = 64 // 8 seconds: a whole number of loops for every state except burp

const states = [...allStates()].sort((a, b) => b.priority - a.priority)
const rows = Math.ceil(states.length / COLUMNS)
const cellW = CANVAS_W * SCALE
const cellH = CANVAS_H * SCALE
const width = COLUMNS * cellW + (COLUMNS + 1) * GAP
const height = rows * cellH + (rows + 1) * GAP

const signals = (fiveHourPct: number | null) => ({ ...initialSignals(10_000_000, 4), fiveHourPct })

const dir = mkdtempSync(join(tmpdir(), 'clawd-gif-'))
try {
  for (let step = 0; step < STEPS; step++) {
    const rgb = Buffer.alloc(width * height * 3)
    for (let i = 0; i < width * height; i++) {
      rgb[i * 3] = (BACKGROUND >> 16) & 255
      rgb[i * 3 + 1] = (BACKGROUND >> 8) & 255
      rgb[i * 3 + 2] = BACKGROUND & 255
    }
    states.forEach((state, index) => {
      const frameNumber = Math.floor((step * STEP_MS) / state.frameMs) % state.frames
      const s = signals(state.id === 'limit-warn' ? 85 : state.id === 'limit-hit' ? 100 : null)
      const { px } = rasterize(composeFrame(state, s, { ...DEFAULT_PROFILE, xp: 625, level: 6 }, frameNumber))
      const left = GAP + (index % COLUMNS) * (cellW + GAP)
      const top = GAP + Math.floor(index / COLUMNS) * (cellH + GAP)
      for (let y = 0; y < CANVAS_H; y++) {
        for (let x = 0; x < CANVAS_W; x++) {
          const color = px[y * CANVAS_W + x] as number
          if (color < 0) continue
          for (let dy = 0; dy < SCALE; dy++) {
            for (let dx = 0; dx < SCALE; dx++) {
              const at = ((top + y * SCALE + dy) * width + left + x * SCALE + dx) * 3
              rgb[at] = (color >> 16) & 255
              rgb[at + 1] = (color >> 8) & 255
              rgb[at + 2] = color & 255
            }
          }
        }
      }
    })
    writeFileSync(join(dir, `f${String(step).padStart(3, '0')}.ppm`), Buffer.concat([Buffer.from(`P6\n${width} ${height}\n255\n`), rgb]))
  }
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(1000 / STEP_MS),
      '-i', join(dir, 'f%03d.ppm'),
      '-vf', 'split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=none',
      '-loop', '0', OUT,
    ],
    { stdio: 'inherit' },
  )
  console.log(`wrote ${OUT}`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
