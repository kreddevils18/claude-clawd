// The subagents' meadow for surfaces with an Svg element: a flower field under a pale sky, little
// Clawds standing in it, hearts passing between them and butterflies drifting by. Everything is
// worked out from the subagents' own frames and a tick, so it moves when the band is redrawn.

import type { AgentScene } from '../agents/agent-view.ts'
import { SPRITE_CROP, escapeXml, spriteSvgInner } from '../sprite/renderers/svg-renderer.ts'
import { FLOWER_COLORS, hash } from './flowers.ts'

export const MEADOW_H = 60
const SLOT = 62
const SPRITE_SCALE = 2.4
const SPRITE_W = SPRITE_CROP.w * SPRITE_SCALE
const SPRITE_H = SPRITE_CROP.h * SPRITE_SCALE
const GROUND_Y = MEADOW_H - 13

/** States that play (hop) rather than work. */
const PLAYFUL = new Set(['idle', 'done', 'pat', 'listening', 'level-up'])

export const meadowWidth = (agents: number): number => (agents === 0 ? 0 : agents * SLOT + 16)

const flower = (x: number, y: number, color: string, sway: number, stem: number): string => {
  const cx = (x + sway).toFixed(1)
  const petals = [0, 1, 2, 3, 4]
    .map(k => {
      const a = (k / 5) * Math.PI * 2 - Math.PI / 2
      return `<circle cx="${(x + sway + Math.cos(a) * 2.6).toFixed(1)}" cy="${(y - stem + Math.sin(a) * 2.6).toFixed(1)}" r="2.1" fill="${color}"/>`
    })
    .join('')
  return (
    `<path d="M${x} ${y}Q${x + sway / 2} ${y - stem / 2} ${cx} ${y - stem}" stroke="#3e8e41" stroke-width="1" fill="none"/>` +
    petals +
    `<circle cx="${cx}" cy="${y - stem}" r="1.5" fill="#f6c945"/>`
  )
}

const heart = (x: number, y: number): string =>
  `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(.55)" d="M0 4C-6-1-3-7 0-3 3-7 6-1 0 4Z" fill="#f27ea9"/>`

const butterfly = (x: number, y: number, flap: boolean, color: string): string => {
  const w = flap ? 3.2 : 1.6
  return (
    `<ellipse cx="${(x - w).toFixed(1)}" cy="${y.toFixed(1)}" rx="${w}" ry="2.4" fill="${color}"/>` +
    `<ellipse cx="${(x + w).toFixed(1)}" cy="${y.toFixed(1)}" rx="${w}" ry="2.4" fill="${color}"/>` +
    `<rect x="${(x - 0.4).toFixed(1)}" y="${(y - 2).toFixed(1)}" width=".8" height="4" fill="#5b4636"/>`
  )
}

/** The meadow as nested SVG content, `width` × MEADOW_H, for composing into a larger drawing. */
export const meadowInner = (agents: readonly AgentScene[], tick: number): string => {
  const width = meadowWidth(agents.length)
  const parts: string[] = []
  parts.push(`<clipPath id="mc"><rect width="${width}" height="${MEADOW_H}" rx="12"/></clipPath><g clip-path="url(#mc)">`)
  parts.push(`<rect width="${width}" height="${MEADOW_H}" fill="#9fd8f0" fill-opacity=".22"/>`)
  parts.push(
    `<path d="M0 ${GROUND_Y}Q${width * 0.15} ${GROUND_Y - 6} ${width * 0.3} ${GROUND_Y}T${width * 0.6} ${GROUND_Y}T${width} ${GROUND_Y}V${MEADOW_H}H0Z" fill="#4caf50" fill-opacity=".6"/>`,
  )
  parts.push(`<rect y="${GROUND_Y + 6}" width="${width}" height="${MEADOW_H}" fill="#3e8e41" fill-opacity=".55"/>`)

  // Flowers behind the little Clawds.
  const count = Math.floor(width / 15)
  for (let k = 0; k < count; k++) {
    const h = hash(k * 11 + 5)
    const x = 6 + (h % Math.max(1, width - 12))
    const sway = Math.sin((tick + k) * 0.9) * 1.1
    parts.push(flower(x, GROUND_Y + 2 + (h % 6), FLOWER_COLORS[h % FLOWER_COLORS.length] as string, sway, 6 + (h % 8)))
  }

  // The little Clawds, each in the pose of its own state; the idle ones hop about.
  agents.forEach((agent, i) => {
    const hop = PLAYFUL.has(agent.state.id) ? [0, -3, -5, -3][(tick + i * 2) % 4] ?? 0 : 0
    const x = 8 + i * SLOT
    const y = MEADOW_H - 5 - SPRITE_H + hop
    parts.push(
      `<g><title>${escapeXml(`${agent.name}: ${agent.label}`)}</title>` +
        `<svg x="${x}" y="${y}" width="${SPRITE_W}" height="${SPRITE_H}" viewBox="${SPRITE_CROP.x} ${SPRITE_CROP.y} ${SPRITE_CROP.w} ${SPRITE_CROP.h}" shape-rendering="crispEdges">${spriteSvgInner(agent.frame)}</svg></g>`,
    )
  })

  // Hearts pass between neighbors.
  for (let i = 0; i < agents.length - 1; i++) {
    parts.push(heart(8 + (i + 1) * SLOT - 2, 16 - ((tick + i) % 4) * 2.5))
  }

  // A few flowers in front, and butterflies drifting across.
  for (let k = 0; k < Math.floor(count / 2); k++) {
    const h = hash(k * 17 + 101)
    const x = 4 + (h % Math.max(1, width - 8))
    parts.push(flower(x, MEADOW_H - 3, FLOWER_COLORS[(h >>> 3) % FLOWER_COLORS.length] as string, Math.sin((tick + k) * 0.7), 5 + (h % 5)))
  }
  const flap = tick % 2 === 0
  parts.push(butterfly(((tick * 3) % (width + 20)) - 10, 12 + Math.sin(tick * 0.6) * 4, flap, '#f59e42'))
  if (width > 140) parts.push(butterfly(width - (((tick * 2) % (width + 20)) - 10), 20 + Math.cos(tick * 0.5) * 4, !flap, '#a68cf0'))
  parts.push('</g>')
  return parts.join('')
}

/** The meadow as a drawing of its own (for under the full-size picture in the pane). */
export const meadowSvg = (agents: readonly AgentScene[], tick: number, summary: string): string => {
  const width = meadowWidth(agents.length)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${MEADOW_H}" width="${width}" height="${MEADOW_H}" role="img">` +
    `<title>${escapeXml(summary)}</title>` +
    meadowInner(agents, tick) +
    `</svg>`
  )
}
