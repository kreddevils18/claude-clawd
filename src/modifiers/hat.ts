import type { Modifier } from '../core/modifier.ts'
import { BEANIE, CROWN, WIZARD, bitmapLayer, type Bitmap } from '../sprite/bitmaps.ts'
import { bodyBox } from '../sprite/body-parts.ts'
import { hatToWear, type Hat } from '../progression/xp.ts'

const HAT_BITMAPS: Readonly<Record<Hat, Bitmap>> = { beanie: BEANIE, crown: CROWN, wizard: WIZARD }

/** Sits on top of the head, whatever the body size; never pushed off the top of the canvas. */
export const hat: Modifier = {
  id: 'hat',
  apply: (frame, _s, profile) => {
    const wearing = hatToWear(profile)
    if (!wearing) return frame
    const bitmap = HAT_BITMAPS[wearing]
    const box = bodyBox(frame.body)
    const x = Math.floor(box.centerX - bitmap.w / 2)
    const y = Math.max(0, box.top - bitmap.h + 1)
    return { ...frame, layers: [...frame.layers, bitmapLayer(bitmap, x, y)] }
  },
}
