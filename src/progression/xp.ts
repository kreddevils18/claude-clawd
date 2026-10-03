// Progression: pure XP, level and hat rules. Persistence lives in the adapter.

import type { HatChoice, Profile } from '../../types/index.d.ts'

export type Hat = Exclude<HatChoice, 'auto' | 'none'>

const XP_PER_TURN = 10
const XP_PER_TOOL = 1
export const XP_TURN_CAP = 30

/** (level, hat) in unlock order. */
export const HAT_UNLOCKS: readonly (readonly [number, Hat])[] = [
  [3, 'beanie'],
  [6, 'crown'],
  [10, 'wizard'],
]

export const DEFAULT_PROFILE: Profile = Object.freeze({
  xp: 0,
  level: 1,
  hat: 'auto',
  muted: false,
  bandHidden: false,
})

export const levelFor = (xp: number): number => Math.floor(Math.sqrt(Math.max(0, xp) / 25)) + 1

/** XP at which `level` begins. */
const xpForLevel = (level: number): number => 25 * (level - 1) ** 2

export const xpToNextLevel = (xp: number): number => xpForLevel(levelFor(xp) + 1) - xp

export const unlockedHats = (level: number): Hat[] =>
  HAT_UNLOCKS.filter(([at]) => level >= at).map(([, hat]) => hat)

/** XP granted for `amount` more earned in a turn that already earned `earnedThisTurn`, under the cap. */
export const grantXp = (earnedThisTurn: number, amount: number): number =>
  Math.max(0, Math.min(amount, XP_TURN_CAP - earnedThisTurn))

/** The hat to draw: the player's pick when unlocked, else the highest unlocked, or none. */
export const hatToWear = (profile: Profile): Hat | null => {
  if (profile.hat === 'none') return null
  const unlocked = unlockedHats(profile.level)
  if (profile.hat !== 'auto' && unlocked.includes(profile.hat)) return profile.hat
  return unlocked[unlocked.length - 1] ?? null
}

/** The profile after a completed turn that made `toolsOk` successful tool calls. */
export const applyTurnXp = (
  profile: Profile,
  toolsOk: number,
): { profile: Profile; gained: number; leveledUp: boolean } => {
  const gained = grantXp(0, XP_PER_TURN + toolsOk * XP_PER_TOOL)
  const xp = profile.xp + gained
  const level = levelFor(xp)
  return { profile: { ...profile, xp, level }, gained, leveledUp: level > profile.level }
}

/** Accepts whatever $.store held and returns a well-formed profile. */
export const parseProfile = (raw: unknown): Profile => {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_PROFILE
  const r = raw as Record<string, unknown>
  const xp = typeof r.xp === 'number' && Number.isFinite(r.xp) && r.xp >= 0 ? Math.floor(r.xp) : 0
  const hats = ['auto', 'none', 'beanie', 'crown', 'wizard']
  return {
    xp,
    level: levelFor(xp),
    hat: typeof r.hat === 'string' && hats.includes(r.hat) ? (r.hat as Profile['hat']) : 'auto',
    muted: r.muted === true,
    bandHidden: r.bandHidden === true,
  }
}
