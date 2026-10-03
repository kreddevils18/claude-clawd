// The flower field: where each flower stands and what color it is, from a seed alone.

export const FLOWER_COLORS = ['#f27ea9', '#f6c945', '#a68cf0', '#f4f1ea', '#ef6b5b', '#6aa8f0', '#f59e42'] as const
export const GRASS = '#6fcf7a'
export const GROUND = '#27452c'

/** Small deterministic integer hash: the same number always gives the same answer. */
export const hash = (n: number): number => {
  let x = Math.imul(n | 0 ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return x >>> 0
}

export const flowerColor = (seed: number): string =>
  FLOWER_COLORS[hash(seed) % FLOWER_COLORS.length] as string
