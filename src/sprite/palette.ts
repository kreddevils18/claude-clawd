// Named colors, as 0xRRGGBB. States and bitmaps use these names, never raw numbers.

export const PALETTE = Object.freeze({
  body: 0xd97757,
  shade: 0xb4573a,
  dark: 0x2a1a14,
  white: 0xffffff,
  blush: 0xf4a3a0,
  heart: 0xe8556d,
  spark: 0xffd84d,
  sparkSoft: 0xfff0a8,
  sweat: 0x7ec8f0,
  paper: 0xf5ecd9,
  ink: 0x6b4a3a,
  cover: 0x8a5a44,
  battery: 0x7bd88f,
  warn: 0xf0b840,
  danger: 0xe8554d,
  steel: 0x8e9aa6,
  cloud: 0xcfd6dd,
  night: 0x5b6ee1,
  beanie: 0x4aa3a0,
  beanieBand: 0x2f7774,
  gold: 0xf2c230,
  goldDark: 0xb98a14,
  gem: 0xe8554d,
  wizard: 0x5b3f9e,
  wizardDark: 0x3c2a6e,
})

/** 0xRRGGBB → '#rrggbb', for surfaces that take CSS-like color strings. */
export const toHex = (color: number): string => `#${color.toString(16).padStart(6, '0')}`
