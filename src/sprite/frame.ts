// Frame: a recipe for one picture. Decorators change it; a rasterizer draws it.

export const CANVAS_W = 50
export const CANVAS_H = 16

export type EyeShape = 'open' | 'down' | 'up' | 'closed' | 'happy' | 'wide' | 'x' | 'tired'
export type MouthShape = 'smile' | 'o' | 'sad' | 'flat' | 'yawn'
export type ArmPose = 'side' | 'up' | 'half' | 'down' | 'wide'
export type LegPose = 'stand' | 'a' | 'b' | 'jump'
export type Fat = 0 | 1 | 2

export type BodyOptions = {
  fat: Fat
  /** Offset of the whole body from its resting place, in canvas pixels. */
  dx: number
  dy: number
  arms: { left: ArmPose; right: ArmPose }
  legs: LegPose
}

export type Rect = { x: number; y: number; w: number; h: number; color: number }
export type Dot = { x: number; y: number; color: number }

/** Pixels drawn above the body, in order. */
export type Layer =
  | { kind: 'rect'; rect: Rect }
  | { kind: 'dots'; dots: readonly Dot[] }

/** A character laid over the raster, in terminal cell coordinates (50 × 8). */
export type Glyph = { col: number; row: number; ch: string; color: number }

export type Frame = {
  body: BodyOptions
  eyes: { shape: EyeShape; shiftX: number }
  mouth: MouthShape | null
  blush: boolean
  layers: readonly Layer[]
  glyphs: readonly Glyph[]
  /** Mini band only: eye shape of the 9×3 logo and the one-cell badge. */
  miniEyes: EyeShape
  badge: string | null
}

export const DEFAULT_BODY: BodyOptions = Object.freeze({
  fat: 0,
  dx: 0,
  dy: 0,
  arms: Object.freeze({ left: 'side', right: 'side' }),
  legs: 'stand',
})
