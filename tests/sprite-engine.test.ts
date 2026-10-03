import { expect, test } from 'claude-code/testing'

import { toBase64 } from '../src/sprite/base64.ts'
import { HEART } from '../src/sprite/bitmaps.ts'
import { bodyBox } from '../src/sprite/body-parts.ts'
import { CANVAS_H, CANVAS_W, type EyeShape } from '../src/sprite/frame.ts'
import { PALETTE } from '../src/sprite/palette.ts'
import { rasterize } from '../src/sprite/rasterize.ts'
import { fullRasterRenderer } from '../src/sprite/renderers/full-raster-renderer.ts'
import { miniQuadrantRenderer } from '../src/sprite/renderers/mini-quadrant-renderer.ts'
import { spriteSvg } from '../src/sprite/renderers/svg-renderer.ts'
import { sprite } from '../src/sprite/sprite-builder.ts'

const EYES: EyeShape[] = ['open', 'down', 'up', 'closed', 'happy', 'wide', 'x', 'tired']

test('mini renderer draws exactly the original logo for the neutral frame', () => {
  const { glyphs } = miniQuadrantRenderer.render(sprite().build(), { background: 'default' })
  expect(glyphs).toEqual([' ▐▛███▜▌ ', '▝▜█████▛▘', '  ▘▘ ▝▝  '])
})

test('mini renderer stays 9×3 for every eye shape and swaps the notches', () => {
  const seen = new Set<string>()
  for (const eyes of EYES) {
    const { glyphs } = miniQuadrantRenderer.render(sprite().miniEyes(eyes).build(), { background: 'default' })
    expect(glyphs.length).toBe(3)
    for (const line of glyphs) expect([...line].length).toBe(9)
    seen.add(glyphs.join('/'))
  }
  // closed fills the notch, wide widens it: at least three distinct faces.
  expect(seen.size >= 3).toBe(true)
  const closed = miniQuadrantRenderer.render(sprite().miniEyes('closed').build(), { background: 'default' })
  expect(closed.glyphs[0]).toBe(' ▐█████▌ ')
  const wide = miniQuadrantRenderer.render(sprite().miniEyes('wide').build(), { background: 'default' })
  expect(wide.glyphs[0]).toBe(' ▐▌███▐▌ ')
})

test('mini renderer carries the badge', () => {
  const out = miniQuadrantRenderer.render(sprite().badge('!').build(), { background: 'default' })
  expect(out.badge).toBe('!')
  expect(miniQuadrantRenderer.render(sprite().build(), { background: 'default' }).badge).toBe('')
})

test('full raster renderer packs cells as little-endian u32 triplets in base64', () => {
  // A hand-computed frame: one orange pixel at (0, 0), nothing else.
  const frame = sprite().rect(0, 0, 1, 1, 0xff8800).build()
  const out = fullRasterRenderer.render(
    { ...frame, body: { ...frame.body, dy: 100 } }, // body far off canvas: only our pixel is drawn
    { background: 'default' },
  )
  expect(out.columns).toBe(50)
  expect(out.rows).toBe(8)
  // Cell (0,0): '▀' (0x2580), fg 0xff8800, bg default 0x01000000.
  const first = [0x80, 0x25, 0x00, 0x00, 0x00, 0x88, 0xff, 0x00, 0x00, 0x00, 0x00, 0x01]
  expect(out.cells.startsWith(toBase64(Uint8Array.from(first)))).toBe(true)
  // Whole payload: 50 × 8 cells × 12 bytes.
  expect(Math.ceil((50 * 8 * 12) / 3) * 4).toBe(out.cells.length)
})

test('base64 matches the standard encoding including padding', () => {
  const enc = (s: string) => toBase64(Uint8Array.from([...s].map(c => c.charCodeAt(0))))
  expect(enc('')).toBe('')
  expect(enc('f')).toBe('Zg==')
  expect(enc('fo')).toBe('Zm8=')
  expect(enc('foo')).toBe('Zm9v')
  expect(enc('foobar')).toBe('Zm9vYmFy')
})

test('svg renderer draws the picture as well-formed vector pixels', () => {
  const svg = spriteSvg(sprite().mouth('smile').glyph(3, 1, '!', 0xff0000).build(), { scale: 8 })
  expect(svg.startsWith('<svg ')).toBe(true)
  expect(svg.endsWith('</svg>')).toBe(true)
  expect(svg).toContain('viewBox="0 0 50 16"')
  expect(svg).toContain('width="400" height="128"')
  expect(svg).toContain('fill="#d97757"')
  expect(svg).toContain('>!</text>')
  // Escaping: a glyph that is markup must not break out.
  expect(spriteSvg(sprite().glyph(0, 0, '<', 0xffffff).build(), { scale: 1 })).toContain('&lt;')
  // Cropping changes the viewport, not the pixels.
  const cropped = spriteSvg(sprite().build(), { scale: 4, crop: { x: 13, y: 0, w: 24, h: 15 } })
  expect(cropped).toContain('viewBox="13 0 24 15"')
  expect(cropped).toContain('width="96" height="60"')
})

test('the body has the logo proportions: 12 wide, 8 tall, eyes are 1×2 holes', () => {
  const { px } = rasterize(sprite().build())
  const at = (x: number, y: number) => px[y * CANVAS_W + x] as number
  // Body x 19..30, y 5..12; arms x 17..18 and 31..32 on rows 9..10; eyes at x 21 and 28, rows 7..8.
  expect(at(19, 5)).toBe(PALETTE.body)
  expect(at(30, 12)).toBe(PALETTE.body)
  expect(at(18, 9)).toBe(PALETTE.body)
  expect(at(32, 10)).toBe(PALETTE.body)
  expect(at(18, 8)).toBe(-1) // above the arm
  expect(at(21, 7)).toBe(-1)
  expect(at(21, 8)).toBe(-1)
  expect(at(21, 9)).toBe(PALETTE.body) // the hole is two rows tall, no more
  expect(at(28, 7)).toBe(-1)
  expect(at(20, 13)).toBe(PALETTE.body) // legs are one wide
  expect(at(21, 13)).toBe(-1)
})

test('the mini logo follows the pose, not just the face', () => {
  const draw = (b: ReturnType<typeof sprite>) => miniQuadrantRenderer.render(b.build(), { background: 'default' }).glyphs.join('/')
  const neutral = draw(sprite())
  expect(draw(sprite().body({ arms: { left: 'up', right: 'up' } })) === neutral).toBe(false)
  expect(draw(sprite().body({ legs: 'jump' })) === neutral).toBe(false)
  expect(draw(sprite().body({ legs: 'a' })) === draw(sprite().body({ legs: 'b' }))).toBe(false)
  expect(draw(sprite().body({ fat: 2 })) === neutral).toBe(false)
  expect(draw(sprite().body({ dy: 1, legs: 'jump' })) === neutral).toBe(false)
})

test('builder drops out-of-bounds pixels and counts them instead of throwing', () => {
  const frame = sprite().prop(HEART, -3, 15).rect(48, 14, 10, 10, PALETTE.spark).build()
  const { clipped, px } = rasterize(frame)
  expect(clipped > 0).toBe(true)
  expect(px.length).toBe(CANVAS_W * CANVAS_H)
})

test('the neutral body fits the canvas at every fat level and leg pose', () => {
  for (const fat of [0, 1, 2] as const) {
    for (const legs of ['stand', 'a', 'b', 'jump'] as const) {
      const frame = sprite().body({ fat, legs }).eyes('happy').mouth('o').blush().build()
      expect(rasterize(frame).clipped, `fat ${fat} legs ${legs}`).toBe(0)
    }
  }
})

test('fat 2 moves the head top up by one row', () => {
  const top = (fat: 0 | 1 | 2) => bodyBox(sprite().body({ fat }).build().body).top
  expect(top(1)).toBe(top(0))
  expect(top(2)).toBe(top(0) - 1)
})

test('particles are deterministic per seed and differ across seeds', () => {
  const area = { x: 0, y: 0, w: 20, h: 8 }
  const a = sprite().particles(7, 6, [PALETTE.spark], area).build().layers
  const b = sprite().particles(7, 6, [PALETTE.spark], area).build().layers
  const c = sprite().particles(8, 6, [PALETTE.spark], area).build().layers
  expect(a).toEqual(b)
  expect(JSON.stringify(a) === JSON.stringify(c)).toBe(false)
})
