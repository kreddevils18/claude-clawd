// The only list of states. Adding a state is one import and one line here.

import type { ClawdState } from '../core/clawd-state.ts'
import { bash } from './bash.ts'
import { burp } from './burp.ts'
import { done } from './done.ts'
import { edit } from './edit.ts'
import { fail } from './fail.ts'
import { idle } from './idle.ts'
import { levelUp } from './level-up.ts'
import { listening } from './listening.ts'
import { limitHit } from './limit-hit.ts'
import { limitWarn } from './limit-warn.ts'
import { pat } from './pat.ts'
import { read } from './read.ts'
import { sleep } from './sleep.ts'
import { think } from './think.ts'
import { wait } from './wait.ts'

export const STATES: readonly ClawdState[] = [
  idle,
  sleep,
  think,
  read,
  edit,
  bash,
  wait,
  fail,
  done,
  burp,
  limitWarn,
  limitHit,
  pat,
  levelUp,
  listening,
]
