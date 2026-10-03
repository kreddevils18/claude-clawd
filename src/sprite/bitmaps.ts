// Flyweight: shared, frozen bitmaps, defined once. '.' is transparent; every other
// character is looked up in the bitmap's legend (or in a recolor passed to prop()).

import type { Dot, Layer } from './frame.ts'
import { PALETTE } from './palette.ts'

export type Legend = Readonly<Record<string, number>>

export type Bitmap = {
  readonly w: number
  readonly h: number
  readonly rows: readonly string[]
  readonly legend: Legend
}

const bitmap = (rows: readonly string[], legend: Legend): Bitmap => {
  const w = rows[0]?.length ?? 0
  for (const row of rows) {
    if (row.length !== w) throw new Error(`bitmap row "${row}" is not ${w} wide`)
  }
  return Object.freeze({ w, h: rows.length, rows: Object.freeze([...rows]), legend: Object.freeze({ ...legend }) })
}

/** Expand a bitmap to dots at (x, y); `recolor` overrides legend entries. */
const bitmapDots = (bm: Bitmap, x: number, y: number, recolor?: Legend): Dot[] => {
  const dots: Dot[] = []
  bm.rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx] as string
      if (ch === '.') continue
      const color = recolor?.[ch] ?? bm.legend[ch]
      if (color !== undefined) dots.push({ x: x + rx, y: y + ry, color })
    }
  })
  return dots
}

export const bitmapLayer = (bm: Bitmap, x: number, y: number, recolor?: Legend): Layer => ({
  kind: 'dots',
  dots: bitmapDots(bm, x, y, recolor),
})

const P = PALETTE

export const Z = bitmap(['#####', '...#.', '..#..', '.#...', '#####'], { '#': P.night })
export const Z_SMALL = bitmap(['###', '.#.', '###'], { '#': P.night })

export const SPARK = bitmap(['..#..', '.#o#.', '#ooo#', '.#o#.', '..#..'], {
  '#': P.spark,
  o: P.sparkSoft,
})
export const SPARK_SMALL = bitmap(['.#.', '###', '.#.'], { '#': P.spark })

export const HEART = bitmap(
  ['.hh.hh.', 'hwhhhhh', 'hhhhhhh', '.hhhhh.', '..hhh..', '...h...'],
  { h: P.heart, w: P.blush },
)

export const BOOK = bitmap(
  ['cccccccccccc', 'cppppccppppc', 'cplppccpplpc', 'cppppccppppc', 'cpllpccpllpc', 'cccccccccccc'],
  { c: P.cover, p: P.paper, l: P.ink },
)

export const BATTERY_LOW = bitmap(
  ['##########.', '#ww......##', '#ww......##', '##########.'],
  { '#': P.steel, w: P.warn },
)
export const BATTERY_EMPTY = bitmap(
  ['##########.', '#........##', '#........##', '##########.'],
  { '#': P.danger },
)

export const SWEAT = bitmap(['.#.', '#s#', '#s#', '.#.'], { '#': P.sweat, s: P.white })
export const CLOUD = bitmap(['..###...', '.#####..', '########', '.######.'], { '#': P.cloud })
export const PUFF = bitmap(['.#.#.', '#####', '.###.'], { '#': P.cloud })
export const BANG = bitmap(['##', '##', '##', '##', '..', '##'], { '#': P.warn })
export const PROMPT = bitmap(['#.......', '.#......', '..#.....', '.#...###', '#.......'], {
  '#': P.battery,
})
export const PENCIL = bitmap(['....##', '...#o#', '..#o#.', '.#o#..', '#o#...', '##....'], {
  '#': P.ink,
  o: P.spark,
})

export const BUBBLE = bitmap(
  [
    '.###########.',
    '#wwwwwwwwwww#',
    '#wwwwwwwwwww#',
    '#wwwwwwwwwww#',
    '.###########.',
    '..#w#........',
    '...#.........',
  ],
  { '#': P.ink, w: P.white },
)

export const BEANIE = bitmap(
  ['.....yy.....', '...aaaaaa...', '..aaaaaaaa..', '.bbbbbbbbbb.'],
  { a: P.beanie, b: P.beanieBand, y: P.spark },
)
export const CROWN = bitmap(
  ['g..g.gg.g..g', 'gg.gggggg.gg', 'gggggggggggg', 'ddddeedddddd'],
  { g: P.gold, d: P.goldDark, e: P.gem },
)
export const WIZARD = bitmap(
  ['.....ww.....', '....wwww....', '...wwswww...', '..wwwwwwww..', 'dddddddddddd'],
  { w: P.wizard, d: P.wizardDark, s: P.spark },
)
