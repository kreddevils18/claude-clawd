// Strategy: one Frame, many outputs. Each renderer turns a Frame into what its surface draws.

import type { Frame } from '../frame.ts'

export type Theme = {
  /** 0xRRGGBB behind transparent pixels, or 'default' to let the terminal show through. */
  background: number | 'default'
}

export interface Renderer<Out> {
  render(frame: Frame, theme: Theme): Out
}
