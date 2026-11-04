import { createContext } from 'react'
import type { Action, MatchState } from '@tele/engine'
import type { Music, SoundId, TrackId } from './music'

export const SoundContext = createContext<Music | null>(null)

export const MusicContext = createContext<Music | null>(null)

export const TENSE_MARGIN = 5

export const ACTION_SOUNDS: Record<Action['type'], SoundId> = {
  draw: 'card',
  discard: 'card',
  goOut: 'out',
}

export const STARTER_SOUNDS: Record<'hop' | 'stop', SoundId> = {
  hop: 'tick',
  stop: 'chime',
}

export const REVEAL_SOUNDS: Record<'set', SoundId> = {
  set: 'tick',
}

export const ROUND_TRACKS: Record<'calm' | 'close', TrackId> = {
  calm: 'table',
  close: 'tense',
}

export function trackForMatch(state: MatchState | null): TrackId {
  if (!state) return 'intro'
  const totals = state.results.reduce(
    (sums, result) => sums.map((sum, seat) => sum + result.points[seat]),
    Array.from({ length: state.players }, () => 0),
  )
  const close = totals.some((total) => total >= state.target - TENSE_MARGIN)
  return ROUND_TRACKS[close ? 'close' : 'calm']
}
