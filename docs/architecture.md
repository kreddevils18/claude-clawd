# Architecture

Clawd is built so that **Claude Code is touched in one file** and every other piece is pure TypeScript that a contributor can read, test and extend without running Claude Code.

```
Claude Code events ──► [Adapter] hooks/register.tsx ──► SignalEvent
                                                          │
                                         [Observer] reduce(): pure reducer → Signals snapshot
                                                          │  stored in $.state only when it matters
                                [State + priority registry] selectState(signals) → ClawdState
                                                          │
                     ClawdState.draw(builder) ──► [Builder] SpriteBuilder ──► Frame (a recipe)
                                                          │
                                   [Decorator] modifiers: context size, then hat
                                                          │
                     [Strategy] renderer: miniQuadrantRenderer (terminal band) | fullRasterRenderer (terminal pane)
                                                          │                | svg renderer + band-svg (desktop, editor, mobile)
                                       Adapter draws the result with $.ui elements
```

| Pattern | Where | Why it matters |
|---|---|---|
| Adapter | [`hooks/register.tsx`](../hooks/register.tsx) | The engine API is early access. A change touches one file; states never see `$`. |
| Observer | [`src/core/signal-store.ts`](../src/core/signal-store.ts) | Events update one `Signals` snapshot that states only read. |
| State | [`src/states/*.ts`](../src/states) | One file per state: trigger, animation, mini face, label. |
| Registry + priority | [`src/core/state-registry.ts`](../src/core/state-registry.ts), [`priorities.ts`](../src/core/priorities.ts) | The highest-priority matching state wins; adding one is a line in [`states/index.ts`](../src/states/index.ts). |
| Builder | [`src/sprite/sprite-builder.ts`](../src/sprite/sprite-builder.ts) | A small DSL, so states stay short: `b.body(...).eyes('happy').prop(HEART, x, y)`. |
| Decorator | [`src/modifiers/*.ts`](../src/modifiers) | Context size and hats apply on top of any state, including future ones. |
| Strategy | [`src/sprite/renderers/*.ts`](../src/sprite/renderers), [`src/hud/*`](../src/hud) | One frame renders as the terminal band, the terminal pane, or vector art. |
| Flyweight | [`src/sprite/bitmaps.ts`](../src/sprite/bitmaps.ts) | Shared bitmaps (hearts, sparks, hats) are defined and frozen once. |

## Why a Frame is a recipe, not pixels

A state draws a `Frame`: body options, eye and mouth shapes and a list of prop layers. It is rasterized only at the end. That is what lets a Decorator change the body after the state has drawn (the context-size modifier forces the body's `fat`, the hat modifier reads where the head ended up) without states knowing about either.

## The canvas

50×16 pixels, shown as 50 columns × 8 rows of half-block cells (`▀`: the top pixel is the foreground, the bottom pixel the background). Clawd is the 18×6 logo. In a terminal a logo pixel is half a cell wide and half a cell tall, so it is twice as tall as it is wide; on our square-pixel canvas each logo pixel is therefore **1 wide × 2 tall**. That gives the logo's own proportions: a 12×8 body resting at x=16, y=5, 2×2 arms, four 1×2 legs and 1×2 eyes that are holes cut through the body. The free strips are x 0–15 and 34–49, and y 0–4 (hats and bubbles). Pixels outside the canvas are dropped and counted, and the contract test fails on any.

The terminal band uses a separate 18×6 logo grid turned into quadrant glyphs (`▐▛███▜▌`). It is built from the frame's pose (arms, legs, size, eye notches), so every state looks different in the band too.

## Subagents and the meadow

`Signals.agents` holds one `AgentInfo` per subagent (its tool calls, whether it ended). The adapter feeds it from `classic.SubagentStart` / `SubagentStop` and from the `agentId` on `tool.call` and `turn.complete`; the reducer retires finished agents after a short linger and silent ones after three minutes.

[`agent-view.ts`](../src/agents/agent-view.ts) turns each `AgentInfo` into a snapshot shaped like `Signals` and selects its state with the **same registry** as the main agent's, so every state animation is reused and a new state works for subagents with no extra code. [`band-model.ts`](../src/hud/band-model.ts) bundles the main agent's words with the subagents' scenes. The terminal draws them as colored text with eighth-block flowers ([`meadow-terminal.ts`](../src/scene/meadow-terminal.ts), [`band-terminal.ts`](../src/hud/band-terminal.ts)); surfaces with an `Svg` element get a painted meadow ([`meadow-svg.ts`](../src/scene/meadow-svg.ts), [`band-svg.ts`](../src/hud/band-svg.ts)). Flower positions come from a hash of a seed, and sway and hearts advance with a tick, so a picture is deterministic.

## Data flow and redraws

`emit()` in the adapter reduces each event into the stored snapshot. A store write redraws the band and the pane, so [`redraw-policy.ts`](../src/core/redraw-policy.ts) stores a new snapshot only when something other than the clock changed, or when the clock moved far enough to **change the active state** (a transient "done" expiring, the sleep timeout). A 250 ms timer feeds clock ticks and also asks the band to redraw when the animation (the main Clawd, a subagent, or the meadow's sway) moved to a picture that looks different. While the pane is open a second 125 ms timer animates it with `$.ui.blit` (at most 8 fps) and skips frames that look the same.

Sounds play on the edge: when `selectState` returns a different state than before and the new one has a `sound`.

## Surfaces

| Surface | Band | Pane |
|---|---|---|
| terminal | quadrant glyphs | `Raster` |
| desktop, editor, mobile | vector art (`Svg`) | vector art (`Svg`) |

## Persistence

`$.store` key `profile`: `{ xp, level, hat, muted, bandHidden }`. Written on turn completion and on commands, never per tick, and mirrored into `$.state` so drawings update at once.

## Testing

`claude plugin test .` runs everything: the reducer, the sprite engine, a contract test that loops over every registered state, the selector's priority table, the modifiers and progression, and end-to-end tests that mount the band and the pane on the terminal and the desktop surface.
