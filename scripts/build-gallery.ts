// Renders every registered state into docs/gallery.html: one animated card per state, with the
// context sizes and hats applied the way the plugin draws them. Run it after adding a state:
//   node --experimental-strip-types scripts/build-gallery.ts          (write docs/gallery.html)
//   node --experimental-strip-types scripts/build-gallery.ts --check  (fail if it is stale)
// Node >= 22.6, no dependencies. It imports src/ directly, which is pure TypeScript.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { composeFrame } from '../src/core/compose.ts'
import { initialSignals } from '../src/core/signals.ts'
import { allStates } from '../src/core/state-registry.ts'
import { DEFAULT_PROFILE } from '../src/progression/xp.ts'
import { PALETTE } from '../src/sprite/palette.ts'
import { CANVAS_H, CANVAS_W } from '../src/sprite/frame.ts'
import { rasterize } from '../src/sprite/rasterize.ts'
import { miniQuadrantRenderer } from '../src/sprite/renderers/mini-quadrant-renderer.ts'
import type { Profile } from '../types/index.d.ts'

const OUT = fileURLToPath(new URL('../docs/gallery.html', import.meta.url))

const CONTEXTS = [
  { key: 'lean', pct: 20 },
  { key: 'round', pct: 65 },
  { key: 'stuffed', pct: 90 },
] as const
const HATS: readonly { key: string; profile: Profile }[] = [
  { key: 'none', profile: DEFAULT_PROFILE },
  { key: 'beanie', profile: { ...DEFAULT_PROFILE, xp: 100, level: 3 } },
  { key: 'crown', profile: { ...DEFAULT_PROFILE, xp: 625, level: 6 } },
  { key: 'wizard', profile: { ...DEFAULT_PROFILE, xp: 2025, level: 10 } },
]

const SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const palette: number[] = []
const symbolFor = (color: number): string => {
  if (color < 0) return '.'
  let i = palette.indexOf(color)
  if (i < 0) i = palette.push(color) - 1
  return SYMBOLS[i] ?? '?'
}

/** One frame as run-length text: a symbol and a count, '.' for transparent. */
const encode = (px: Int32Array): string => {
  let out = ''
  let run = 1
  for (let i = 1; i <= px.length; i++) {
    if (i < px.length && px[i] === px[i - 1]) {
      run++
      continue
    }
    out += symbolFor(px[i - 1] as number) + run + ';'
    run = 1
  }
  return out
}

const BASE = initialSignals(10_000_000, 4)

const states = allStates().map(state => {
  const variants: Record<string, string[]> = {}
  for (const ctx of CONTEXTS) {
    for (const hat of HATS) {
      const signals = {
        ...BASE,
        contextPct: ctx.pct,
        fiveHourPct: state.id === 'limit-warn' ? 85 : state.id === 'limit-hit' ? 100 : null,
      }
      variants[`${ctx.key}-${hat.key}`] = Array.from({ length: state.frames }, (_, f) =>
        encode(rasterize(composeFrame(state, signals, hat.profile, f)).px),
      )
    }
  }
  const signals = { ...BASE, fiveHourPct: state.id === 'limit-warn' ? 85 : null }
  const mini = miniQuadrantRenderer.render(composeFrame(state, signals, DEFAULT_PROFILE, 0), { background: 'default' })
  // Glyph overlays (text in the bubbles) are the same on every frame of a state.
  const glyphs = composeFrame(state, signals, DEFAULT_PROFILE, 0).glyphs.map(g => ({
    col: g.col,
    row: g.row,
    ch: g.ch,
    color: g.color,
  }))
  return {
    id: state.id,
    glyphs,
    priority: state.priority,
    frames: state.frames,
    frameMs: state.frameMs,
    sound: state.sound ?? null,
    transientMs: state.durationMs ?? null,
    label: state.label(signals),
    badge: mini.badge,
    mini: mini.glyphs,
    variants,
  }
})
states.sort((a, b) => b.priority - a.priority)

const data = JSON.stringify({
  width: CANVAS_W,
  height: CANVAS_H,
  body: PALETTE.body,
  palette,
  contexts: CONTEXTS.map(c => c.key),
  hats: HATS.map(h => h.key),
  states,
})

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Clawd gallery</title>
<style>
  :root { --bg:#1b1713; --card:#262019; --ink:#f3e9dc; --dim:#a6978a; --accent:#d97757; color-scheme: dark; }
  :root[data-theme="light"] { --bg:#f6efe6; --card:#fffaf3; --ink:#2a1a14; --dim:#7a6a5d; color-scheme: light; }
  body { margin:0; padding:24px 16px 48px; background:var(--bg); color:var(--ink); font:15px/1.45 system-ui, sans-serif; }
  h1 { margin:0 0 4px; font-size:22px; }
  p.lede { margin:0 0 16px; color:var(--dim); max-width:60ch; }
  .controls { display:flex; flex-wrap:wrap; gap:12px; margin:0 0 20px; }
  label { color:var(--dim); font-size:13px; display:flex; gap:6px; align-items:center; }
  select { background:var(--card); color:var(--ink); border:1px solid var(--dim); border-radius:6px; padding:4px 8px; font:inherit; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(340px, 1fr)); gap:16px; }
  .card { background:var(--card); border-radius:10px; padding:12px; }
  .stage { position:relative; }
  canvas { width:100%; height:auto; image-rendering:pixelated; display:block; border-radius:6px; background:transparent; }
  .glyph { position:absolute; line-height:1; font-family:ui-monospace, Menlo, monospace; text-align:center; white-space:pre; }
  .head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px; }
  .id { font-weight:600; }
  .meta { color:var(--dim); font-size:12px; }
  pre.mini { margin:8px 0 0; font:14px/1.1 ui-monospace, Menlo, monospace; color:var(--accent); }
  .mini span { color:var(--ink); }
</style>
</head>
<body>
<h1>Clawd gallery</h1>
<p class="lede">Every state, in priority order (highest wins). Generated by <code>scripts/build-gallery.ts</code>; do not edit by hand.</p>
<div class="controls">
  <label>Context <select id="ctx"></select></label>
  <label>Hat <select id="hat"></select></label>
  <label>Theme <select id="theme"><option>dark</option><option>light</option></select></label>
</div>
<div class="grid" id="grid"></div>
<script>
const DATA = ${data};
const SYMBOLS = ${JSON.stringify(SYMBOLS)};
const css = n => '#' + n.toString(16).padStart(6, '0');
const colors = DATA.palette.map(css);
const decode = text => {
  const px = [];
  for (const run of text.split(';')) {
    if (!run) continue;
    const symbol = run[0], count = Number(run.slice(1));
    const color = symbol === '.' ? null : colors[SYMBOLS.indexOf(symbol)];
    for (let i = 0; i < count; i++) px.push(color);
  }
  return px;
};
const decoded = new Map();
const frameOf = (state, variant, f) => {
  const key = state.id + '/' + variant + '/' + f;
  if (!decoded.has(key)) decoded.set(key, decode(state.variants[variant][f]));
  return decoded.get(key);
};
const ctxSel = document.getElementById('ctx'), hatSel = document.getElementById('hat');
DATA.contexts.forEach(c => ctxSel.add(new Option(c)));
DATA.hats.forEach(h => hatSel.add(new Option(h)));
document.getElementById('theme').onchange = e => { document.documentElement.dataset.theme = e.target.value; };
const grid = document.getElementById('grid');
const cards = DATA.states.map(state => {
  const card = document.createElement('div');
  card.className = 'card';
  const mini = state.mini.map((line, i) => i === 2 ? line + ' <span>' + state.badge + '</span>' : line).join('\\n');
  card.innerHTML = '<div class="head"><span class="id">' + state.id + '</span><span class="meta">priority ' + state.priority +
    (state.sound ? ' · sound ' + state.sound : '') + (state.transientMs ? ' · ' + state.transientMs / 1000 + 's' : '') +
    '</span></div><div class="stage"><canvas width="' + DATA.width + '" height="' + DATA.height + '"></canvas></div>' +
    '<div class="meta">' + state.label + '</div><pre class="mini">' + mini + '</pre>';
  grid.append(card);
  const stage = card.querySelector('.stage');
  const spans = state.glyphs.map(g => {
    const span = document.createElement('span');
    span.className = 'glyph';
    span.textContent = g.ch;
    span.style.color = css(g.color);
    span.style.left = (g.col / DATA.width * 100) + '%';
    span.style.top = (g.row / (DATA.height / 2) * 100) + '%';
    span.style.width = (100 / DATA.width) + '%';
    stage.append(span);
    return span;
  });
  return { state, spans, stage, ctx: card.querySelector('canvas').getContext('2d') };
});
const fitGlyphs = () => {
  for (const { spans, stage } of cards) {
    const cell = stage.clientWidth / DATA.width;
    for (const span of spans) span.style.fontSize = cell * 1.7 + 'px';
  }
};
addEventListener('resize', fitGlyphs);
fitGlyphs();
const t0 = performance.now();
const draw = () => {
  const variant = ctxSel.value + '-' + hatSel.value;
  for (const { state, ctx } of cards) {
    const f = Math.floor((performance.now() - t0) / state.frameMs) % state.frames;
    const px = frameOf(state, variant, f);
    ctx.clearRect(0, 0, DATA.width, DATA.height);
    for (let i = 0; i < px.length; i++) {
      if (px[i]) { ctx.fillStyle = px[i]; ctx.fillRect(i % DATA.width, Math.floor(i / DATA.width), 1, 1); }
    }
  }
  requestAnimationFrame(draw);
};
draw();
</script>
</body>
</html>
`

if (process.argv.includes('--check')) {
  let current = ''
  try {
    current = readFileSync(OUT, 'utf8')
  } catch {}
  if (current !== html) {
    console.error('docs/gallery.html is stale: run `node --experimental-strip-types scripts/build-gallery.ts` and commit it.')
    process.exit(1)
  }
  console.log('docs/gallery.html is up to date.')
} else {
  writeFileSync(OUT, html)
  console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(0)} KB, ${states.length} states)`)
}
