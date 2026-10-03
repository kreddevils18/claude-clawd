# Contributing to Clawd

Thanks for helping Clawd grow! The most welcome contribution is **a new state**: a new thing Clawd does when Claude Code does something. Bug fixes, new hats and better animations are welcome too.

Clawd runs inside Claude Code with the same access Claude Code has, so every pull request is read line by line before merging. Small, focused PRs get merged fastest.

## How Clawd is built (2-minute tour)

```
Claude Code events ──► hooks/register.tsx (Adapter: the only file that talks to Claude Code)
                         │ turns events into SignalEvents
                         ▼
                 src/core/signal-store.ts (Observer: one Signals snapshot)
                         │
                         ▼
                 src/core/state-registry.ts (State + priority: picks the active state)
                         │
                         ▼
     src/states/<your-state>.ts ── draws with ──► src/sprite/sprite-builder.ts (Builder)
                         │
                         ▼
                 src/modifiers/* (Decorator: context size, hats; applied to every state)
                         │
                         ▼
                 src/sprite/renderers/* (Strategy: mini band or full pane)
```

The rules that keep this easy to extend:

- **States never touch Claude Code.** Everything under `src/` is pure TypeScript: no `$`, no `claude-code` runtime import, no I/O, no clock. A state only reads `Signals` and draws.
- **One state = one file.** Adding a state never edits another state's file.
- **States are deterministic.** The same signals and frame number always draw the same pixels. Randomness comes from a seed (`b.particles(seed, ...)`).

## Add a new state

### 0. Propose it first (recommended)

Open an issue with the **New state** template: what triggers it, where it sits in the priority order, and a sketch (ASCII, a screenshot of a pixel editor, anything). This avoids building something that conflicts with an existing state.

### 1. Check that the trigger exists in `Signals`

Open `src/core/signals.ts`. If your trigger can be expressed with the existing fields (for example, "Claude ran Bash and it failed twice in a row"), go to step 2.

If you need a **new signal** (for example, "a subagent is running"), that is a bigger change:

1. Add the field to `Signals` and a case to `SignalEvent` in `src/core/signals.ts`.
2. Handle the event in the pure reducer in `src/core/signal-store.ts`, and add a row to its test table.
3. Emit the event from `hooks/register.tsx`. This is the only place you may use `$`. Say in the PR which Claude Code event you hook and why.

Keep signal changes in their own commit, so reviewers can check the Claude Code access separately from the art.

### 2. Pick a priority

When several states match at once, the highest priority wins. The order lives in one file, `src/core/priorities.ts`:

| Priority | State | Meaning |
|---|---|---|
| 100 | wait | Claude needs you: always wins |
| 90 | fail | A tool call failed |
| 85 | limit-hit | Rate limit reached |
| 80 | burp | Just compacted |
| 75 | level-up | Just leveled up |
| 70 | pat | Just patted |
| 60 | done | Turn completed |
| 43–45 | read / bash / edit | Working with a tool |
| 30 | think | Thinking, or using another tool |
| 28 | listening | The person is typing |
| 25 | limit-warn | Rate limit above 80% |
| 10 | sleep | Idle for a minute |
| 0 | idle | Fallback, always matches |

Add **one new constant** to `priorities.ts`. Priorities must be unique (a test checks this). Pick a gap between existing values; you never need to renumber other states.

Rule of thumb: states that need the person's attention go above 60. Short celebrations (transient states with `durationMs`) go between 60 and 80. Ambient moods go below 30.

### 3. Create the state file

Create `src/states/<your-state>.ts` (kebab-case). Copy this template:

```ts
import { defineState, within } from '../core/clawd-state.ts'
import { PRIORITY } from '../core/priorities.ts'
import { HEART } from '../sprite/bitmaps.ts'
import { PALETTE } from '../sprite/palette.ts'

const CHEER_MS = 1500

export const cheering = defineState({
  id: 'cheering',
  priority: PRIORITY.cheering,

  // Pure trigger: read Signals only, no clock (use s.now).
  matches: s => s.lastTool !== null && !s.lastTool.failed && within(s.now, s.lastTool.at, CHEER_MS),

  // Animation: 4 frames, 200 ms each.
  frames: 4,
  frameMs: 200,
  // Optional: transient states end by themselves. They also say when they started,
  // so the animation begins at frame 0.
  durationMs: CHEER_MS,
  since: s => s.lastTool?.at ?? null,

  // Draw one frame. The canvas is 50×16 pixels; the body fills x 17–32, y 5–14, so props go in
  // the free strips at x 0–16 and x 33–49 (left and right) or y 0–4 (above).
  draw: (b, frame) => {
    b.body({ arms: { left: 'up', right: frame % 2 ? 'half' : 'up' }, dy: frame % 2 ? -1 : 0 })
      .eyes('happy')
      .mouth('smile')
      .prop(HEART, 35, 9 - frame * 2, { h: PALETTE.heart })
  },

  // Mini band (9×3 cells): an eye shape and a one-cell badge.
  mini: { eyes: 'happy', badge: '♥' },

  // One short line next to Clawd in the band, at most 32 characters.
  label: () => 'Nice one!',

  // Optional: 'pip' | 'burp'. Use sound sparingly; it plays on entering the state.
  // sound: 'pip',

  // Optional: skip a modifier, for example when your state animates its own size.
  // optOut: ['context-size'],
})
```

Drawing limits the contract test enforces: a body pushed **down** (`dy > 0`) needs `legs: 'jump'` (shorter legs), and a body pushed **up** by more than 2 rows would clip a hat off the top. If the test reports `clipped`, a pixel left the canvas.

Useful building blocks are in `src/sprite/`:

- `body-parts.ts`: eye shapes (`open`, `down`, `up`, `closed`, `happy`, `wide`, `x`, `tired`), mouths (`smile`, `o`, `sad`, `flat`, `yawn`), arms (`side`, `up`, `half`, `down`, `wide`) and legs (`stand`, `a`, `b`, `jump`).
- `bitmaps.ts`: shared art (`Z`, `SPARK`, `SPARK_SMALL`, `HEART`, `BOOK`, `BATTERY_LOW`, `BUBBLE`, hats). Draw one with `b.prop(bitmap, x, y, recolor?)`; text in a bubble is `b.text(col, row, 'hi', color)` on the 50×8 cell grid. If you add a new bitmap, put it here so other states can reuse it.
- `palette.ts`: named colors (`PALETTE.spark`, …). Please don't hard-code hex values in state files.

### 4. Register it (one line)

Add your state to the list in `src/states/index.ts`:

```ts
export const STATES = [
  idle, sleep, think, read, edit, bash, wait, fail, done, burp, limitWarn, limitHit, pat, levelUp,
  cheering, // ← your state
]
```

The order in this list does not matter; `priority` decides. Also add the matching constant to `src/core/priorities.ts` (`cheering: 62`, for example).

### 5. Look at it

```bash
node --experimental-strip-types scripts/build-gallery.ts
```

Open `docs/gallery.html`. Your state appears with every other state, animated, at real pixel size. Check it next to its neighbors in the priority order: it should be clearly different from them.

Then try it live in Claude Code from the repo folder:

```bash
claude --plugin-dir .
```

Use `/clawd` to open the full pane and watch the band above the prompt.

### 6. Run the checks

```bash
claude plugin validate .claude-plugin/plugin.json
```

```bash
claude plugin test .
```

```bash
npx -y -p typescript tsc --noEmit
```

You don't need to write tests for a plain new state. `tests/state-contract.test.ts` runs over **every registered state** and checks the following:

- The id is unique and kebab-case. The priority is unique.
- `draw` never throws, for every frame.
- Every pixel stays inside the 50×16 canvas.
- `draw` is deterministic.
- The label is at most 32 characters, and the badge is one cell.

`tests/state-contract.test.ts` also checks that transient states (those with `durationMs`) define `since`. Please **do** add a row to `tests/selector.test.ts` showing a set of signals that selects your state, plus one row showing that a higher-priority state still wins over yours. If your trigger now also fires for an existing row (one that expected `idle`, say), update that row on purpose and say so in the PR.

### 7. Open the pull request

The PR template asks for the following:

- [ ] A GIF or a screenshot of your state in the gallery
- [ ] The trigger, in one sentence
- [ ] The priority, and why it sits there
- [ ] Whether you added a signal (and which Claude Code event it uses)
- [ ] The regenerated `docs/gallery.html` (CI fails if it is stale)
- [ ] A new row in the README states table

## Add a hat

Hats are plain bitmaps. Add the bitmap to `src/sprite/bitmaps.ts`, add an entry with its unlock level to the hats table in `src/progression/xp.ts`, and regenerate the gallery. The hat modifier places it on the head for every body size.

## Design guidelines

- **Readable at 9×3 cells.** Every state needs a mini form (eyes + badge) that is recognizable in the band. If it only reads at full size, it is not distinct enough.
- **Calm by default.** At most 8 fps, no full-canvas flashing, and sound only for states that need the person's attention.
- **Clawd's silhouette stays.** It is the logo: a 12×8 body, 2×2 arms, 1×2 eye holes and four 1×2 legs. Accessories and particles go around the body. Don't redraw the body shape (the context-size modifier owns it), and give your state its own pose (arms, legs, eyes): the mini band follows them, so a state that only changes props looks identical there.
- **Colors come from `palette.ts`** and must read on both dark and light terminal backgrounds.
- **Labels are short and kind**: "Reading…", "Waiting for you", "Done!".

## Review checklist (maintainers)

- A state PR touches only `src/states/<new>.ts`, `src/states/index.ts`, `src/core/priorities.ts`, `tests/selector.test.ts`, `docs/gallery.html` and the README table. Anything else needs a reason.
- A signal PR is separate, and its `hooks/register.tsx` diff is reviewed for access: no new `$.http`, `$.fs` writes, `$.process`, `$.model`, `$.agent` or `$.tool` calls, and no new dependencies.
- `claude plugin validate .claude-plugin/plugin.json`, `claude plugin test .` and `tsc` pass in CI.

## Release (maintainers)

1. Bump `version` in `.claude-plugin/plugin.json`. Claude Code detects updates by version, so a change without a bump never reaches users.
2. Update `CHANGELOG.md`, merge to `main` and tag `vX.Y.Z`.
3. Users update with `/plugin marketplace update claude-clawd`.

## Code of conduct

Be kind. Clawd is a small orange friend; let's keep the repo as friendly as the pet.
