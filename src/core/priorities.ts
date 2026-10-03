// The one place to read the priority order. Higher wins when several states match.
// wait > fail > limit-hit > burp > level-up > pat > done > edit > bash > read > think
//      > listening > limit-warn > sleep > idle

export const PRIORITY = Object.freeze({
  wait: 100,
  fail: 90,
  limitHit: 85,
  burp: 80,
  levelUp: 75,
  pat: 70,
  done: 60,
  edit: 45,
  bash: 44,
  read: 43,
  think: 30,
  listening: 28,
  limitWarn: 25,
  sleep: 10,
  idle: 0,
})
