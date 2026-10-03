// The band for surfaces with an Svg element: Clawd, a title and status line, and on the right
// edge the subagents' meadow. Drawn as vector art so it stays crisp at any scale.

import { meadowSvg } from '../scene/meadow-svg.ts'
import type { Frame } from '../sprite/frame.ts'
import { SPRITE_CROP, escapeXml, spriteSvgInner } from '../sprite/renderers/svg-renderer.ts'
import type { BandModel } from './band-model.ts'

const LOGO_SCALE = 4
const LOGO_W = SPRITE_CROP.w * LOGO_SCALE
const LOGO_H = SPRITE_CROP.h * LOGO_SCALE
const TEXT_X = LOGO_W + 14
const CHAR_W = 8.6 // generous advance of the 15px title text, so the meadow never overlaps it

const STYLE =
  '<style>.t{fill:#26292e}.d{fill:#26292e;fill-opacity:.62}' +
  '@media (prefers-color-scheme:dark){.t{fill:#ecebe8}.d{fill:#ecebe8;fill-opacity:.62}}</style>'

export type BandSvg = {
  /** Clawd, the title and the agent line: sits on the left. */
  main: string
  /** The subagents' meadow: sits on the right edge. Null with no subagents. */
  meadow: string | null
}

const svgOpen = (width: number, height: number, summary: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">` +
  `<title>${escapeXml(summary)}</title>`

/**
 * The band as two drawings, so the surface can lay them out: the main one hugs the left edge and
 * the meadow the right (a row with `justifyContent: space-between`), whatever the width.
 */
export const bandSvg = (m: BandModel, frame: Frame, tick: number): BandSvg => {
  const titleLength = (m.name.length + ` · Lv ${m.level} · `.length + m.label.length) * CHAR_W
  const textW = Math.max(titleLength, (m.agentLine?.length ?? 0) * 7.4)
  const width = Math.ceil(TEXT_X + textW + 4)
  const logo =
    `<svg x="0" y="0" width="${LOGO_W}" height="${LOGO_H}" viewBox="${SPRITE_CROP.x} ${SPRITE_CROP.y} ${SPRITE_CROP.w} ${SPRITE_CROP.h}" ` +
    `shape-rendering="crispEdges">${spriteSvgInner(frame)}</svg>`
  const title =
    `<text x="${TEXT_X}" y="26" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="15">` +
    `<tspan style="fill:#d97757" font-weight="700">${escapeXml(m.name)}</tspan>` +
    `<tspan class="d"> · Lv ${m.level} · </tspan>` +
    `<tspan class="t" font-weight="600">${escapeXml(m.label)}</tspan></text>`
  const line = m.agentLine
    ? `<text x="${TEXT_X}" y="46" class="d" font-family="system-ui,-apple-system,Segoe UI,sans-serif" font-size="12.5">${escapeXml(m.agentLine)}</text>`
    : ''
  const main = svgOpen(width, LOGO_H, m.summary) + STYLE + logo + title + line + '</svg>'
  const meadow = m.agents.length > 0 ? meadowSvg(m.agents, tick, m.summary) : null
  return { main, meadow }
}
