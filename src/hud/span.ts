// A run of text with one style: what the terminal band and its meadow are made of.

export type Span = { text: string; color?: string; bg?: string; bold?: boolean; dim?: boolean }

export const width = (spans: readonly Span[]): number => spans.reduce((n, s) => n + [...s.text].length, 0)

/** Merge neighbors that share a style, so fewer elements are drawn. */
export const merge = (spans: readonly Span[]): Span[] => {
  const out: Span[] = []
  for (const span of spans) {
    const last = out[out.length - 1]
    if (
      last &&
      last.color === span.color &&
      last.bg === span.bg &&
      last.bold === span.bold &&
      last.dim === span.dim
    ) {
      last.text += span.text
    } else {
      out.push({ ...span })
    }
  }
  return out
}
