// The /clawd command: parsing and the words it answers with. The adapter does the acting.

import type { HatChoice, Profile } from '../../types/index.d.ts'
import { HAT_UNLOCKS, unlockedHats, xpToNextLevel, type Hat } from '../progression/xp.ts'

export type ClawdCommand =
  | { kind: 'open' }
  | { kind: 'pat' }
  | { kind: 'hat'; hat: HatChoice }
  | { kind: 'mute' }
  | { kind: 'unmute' }
  | { kind: 'hide' }
  | { kind: 'show' }
  | { kind: 'stats' }
  | { kind: 'help'; problem?: string }

export const USAGE = [
  '/clawd              open Clawd’s pane',
  '/clawd pat          give Clawd a pat',
  '/clawd hat <beanie|crown|wizard|auto|none>',
  '/clawd mute|unmute  sounds off or on',
  '/clawd hide|show    the band above the prompt',
  '/clawd stats        level, XP and hats',
].join('\n')

const HATS: readonly HatChoice[] = ['auto', 'none', 'beanie', 'crown', 'wizard']

export const parseCommand = (args: string): ClawdCommand => {
  const [word = '', arg] = args.trim().toLowerCase().split(/\s+/)
  switch (word) {
    case '':
      return { kind: 'open' }
    case 'pat':
    case 'mute':
    case 'unmute':
    case 'hide':
    case 'show':
    case 'stats':
      return { kind: word }
    case 'hat': {
      const hat = HATS.find(h => h === arg)
      return hat ? { kind: 'hat', hat } : { kind: 'help', problem: `Pick a hat: ${HATS.join(', ')}.` }
    }
    case 'help':
      return { kind: 'help' }
    default:
      return { kind: 'help', problem: `Unknown option "${word}".` }
  }
}

/** The reason a hat cannot be worn yet, or null when it can. */
export const hatProblem = (profile: Profile, hat: HatChoice): string | null => {
  if (hat === 'auto' || hat === 'none') return null
  if (unlockedHats(profile.level).includes(hat)) return null
  const unlockAt = HAT_UNLOCKS.find(([, name]) => name === hat)?.[0]
  return `The ${hat} unlocks at Lv ${unlockAt}; Clawd is Lv ${profile.level}.`
}

export const statsText = (profile: Profile): string => {
  const hats = unlockedHats(profile.level)
  const lines = [
    `Clawd · Lv ${profile.level} · ${profile.xp} XP (${xpToNextLevel(profile.xp)} to next level)`,
    `Hats unlocked: ${hats.length ? hats.join(', ') : 'none yet'} · wearing: ${profile.hat}`,
    `Sounds: ${profile.muted ? 'muted' : 'on'} · Band: ${profile.bandHidden ? 'hidden' : 'shown'}`,
  ]
  const next = HAT_UNLOCKS.find(([lvl]) => lvl > profile.level)
  if (next) lines.push(`Next hat: ${next[1] as Hat} at Lv ${next[0]}`)
  return lines.join('\n')
}
