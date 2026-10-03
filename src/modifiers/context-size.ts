import type { Modifier } from '../core/modifier.ts'
import type { Fat } from '../sprite/frame.ts'
import { bitmapLayer, SWEAT } from '../sprite/bitmaps.ts'
import { bodyBox } from '../sprite/body-parts.ts'

/** Context fill → body size: lean under 50%, round with cheeks to 80%, stuffed and sweating above. */
export const fatFor = (contextPct: number): Fat => (contextPct > 80 ? 2 : contextPct >= 50 ? 1 : 0)

export const contextSize: Modifier = {
  id: 'context-size',
  apply: (frame, s) => {
    const fat = fatFor(s.contextPct)
    if (fat === 0) return { ...frame, body: { ...frame.body, fat } }
    const body = { ...frame.body, fat }
    if (fat === 1) return { ...frame, body, blush: true }
    const box = bodyBox(body)
    return { ...frame, body, layers: [...frame.layers, bitmapLayer(SWEAT, box.left + 2, box.top)] }
  },
}
