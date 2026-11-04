import type { Level } from '@tele/bots'
import { DEFAULT_TARGET, PLAYER_COUNTS, TARGETS } from '@tele/engine'
import type { PlayerCount } from '@tele/engine'
import { SORT_MODES } from './cards'
import type { SortMode } from './cards'

export const levelKey = 'bot-level'

export const playersKey = 'player-count'

export const targetKey = 'match-target'

export const sortModeKey = 'sort-mode'

export function readLevel(): Level {
  const saved = localStorage.getItem(levelKey)
  return saved === 'easy' || saved === 'hard' ? saved : 'medium'
}

export function readPlayers(): PlayerCount {
  const saved = Number(localStorage.getItem(playersKey))
  return PLAYER_COUNTS.find((count) => count === saved) ?? 4
}

export function readTarget(): number {
  const saved = Number(localStorage.getItem(targetKey))
  return TARGETS.find((target) => target === saved) ?? DEFAULT_TARGET
}

export function readSortMode(): SortMode {
  const saved = localStorage.getItem(sortModeKey)
  return SORT_MODES.find((mode) => mode === saved) ?? 'suit'
}

export const plainFontKey = 'plain-font'

export function readPlainFont(): boolean {
  return localStorage.getItem(plainFontKey) === 'on'
}

export const reduceMotionKey = 'reduce-motion'

export function readReduceMotion(): boolean {
  return localStorage.getItem(reduceMotionKey) === 'on'
}

export const musicKey = 'music'

export function readMusic(): boolean {
  return localStorage.getItem(musicKey) !== 'off'
}
