// Builder: the small DSL states draw with, e.g.
//   sprite().body({ arms: { left: 'up' } }).eyes('happy').mouth('smile').prop(HEART, 42, 2).build()

import { bitmapLayer, type Bitmap, type Legend } from './bitmaps.ts'
import {
  DEFAULT_BODY,
  type BodyOptions,
  type Dot,
  type EyeShape,
  type Frame,
  type Glyph,
  type Layer,
  type MouthShape,
} from './frame.ts'

export type BodyInput = Partial<Omit<BodyOptions, 'arms'>> & {
  arms?: Partial<BodyOptions['arms']>
}

/** Small deterministic PRNG, so a seed always draws the same particles. */
const mulberry32 = (seed: number) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class SpriteBuilder {
  private bodyOptions: BodyOptions = DEFAULT_BODY
  private eyeShape: EyeShape = 'open'
  private eyeShift = 0
  private mouthShape: MouthShape | null = null
  private hasBlush = false
  private layers: Layer[] = []
  private glyphs: Glyph[] = []
  private miniEyeShape: EyeShape | null = null
  private badgeChar: string | null = null

  body(input: BodyInput = {}): this {
    this.bodyOptions = {
      ...this.bodyOptions,
      ...input,
      arms: { ...this.bodyOptions.arms, ...input.arms },
    }
    return this
  }

  eyes(shape: EyeShape, options: { shiftX?: number } = {}): this {
    this.eyeShape = shape
    this.eyeShift = options.shiftX ?? 0
    return this
  }

  mouth(shape: MouthShape | null): this {
    this.mouthShape = shape
    return this
  }

  blush(on = true): this {
    this.hasBlush = on
    return this
  }

  /** Draw any bitmap at canvas coordinates; `recolor` swaps legend colors. */
  prop(bitmap: Bitmap, x: number, y: number, recolor?: Legend): this {
    this.layers.push(bitmapLayer(bitmap, x, y, recolor))
    return this
  }

  rect(x: number, y: number, w: number, h: number, color: number): this {
    this.layers.push({ kind: 'rect', rect: { x, y, w, h, color } })
    return this
  }

  /** Scatter `count` single pixels in `area`; the same seed always lands the same way. */
  particles(
    seed: number,
    count: number,
    colors: readonly number[],
    area: { x: number; y: number; w: number; h: number },
  ): this {
    const next = mulberry32(seed)
    const dots: Dot[] = []
    for (let i = 0; i < count; i++) {
      dots.push({
        x: area.x + Math.floor(next() * area.w),
        y: area.y + Math.floor(next() * area.h),
        color: colors[Math.floor(next() * colors.length)] ?? 0xffffff,
      })
    }
    this.layers.push({ kind: 'dots', dots })
    return this
  }

  /** A character on the terminal cell grid (50 × 8), drawn over the pixels. */
  glyph(col: number, row: number, ch: string, color: number): this {
    this.glyphs.push({ col, row, ch, color })
    return this
  }

  text(col: number, row: number, text: string, color: number): this {
    ;[...text].forEach((ch, i) => this.glyph(col + i, row, ch, color))
    return this
  }

  /** Mini band only: eye shape of the small logo. Defaults to the full eye shape. */
  miniEyes(shape: EyeShape): this {
    this.miniEyeShape = shape
    return this
  }

  /** Mini band only: the one-cell badge beside the logo. */
  badge(ch: string | null): this {
    this.badgeChar = ch
    return this
  }

  build(): Frame {
    return {
      body: this.bodyOptions,
      eyes: { shape: this.eyeShape, shiftX: this.eyeShift },
      mouth: this.mouthShape,
      blush: this.hasBlush,
      layers: this.layers,
      glyphs: this.glyphs,
      miniEyes: this.miniEyeShape ?? this.eyeShape,
      badge: this.badgeChar,
    }
  }
}

export const sprite = (): SpriteBuilder => new SpriteBuilder()
