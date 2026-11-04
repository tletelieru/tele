import type { Card, RoundScore, Seat } from '@tele/engine'

export interface RevealStep {
  seat: Seat
  cards: Card[]
  loose: boolean
}

export type Mood = 'happy' | 'sad'

export const MOOD_JINGLE: Record<Mood, boolean> = { happy: true, sad: false }

export function revealSteps(result: RoundScore): RevealStep[] {
  const players = result.seats.length
  const start = result.out ?? 0
  return Array.from({ length: players }, (_, offset) => (start + offset) % players).flatMap((seat) => {
    const score = result.seats[seat]
    const sets = score.melds.map((meld) => ({ seat, cards: meld.cards, loose: false }))
    const loose = score.loose.length > 0 ? [{ seat, cards: score.loose, loose: true }] : []
    return [...sets, ...loose]
  })
}

export function roundMood(result: RoundScore, human: Seat): Mood {
  if (result.out === human) return 'happy'
  const others = result.points.filter((_, seat) => seat !== human)
  return result.points[human] >= Math.max(...others) ? 'happy' : 'sad'
}
