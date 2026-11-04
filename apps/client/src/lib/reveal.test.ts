import { describe, expect, it } from 'vitest'
import type { Card, RoundScore, SeatScore } from '@tele/engine'
import { revealSteps, roundMood } from './reveal'

const card = (rank: Card['rank']): Card => ({ rank, suit: 'clubs', copy: 0 })

function seat(total: number, melds: number, loose: number, out = false): SeatScore {
  return {
    out,
    melds: Array.from({ length: melds }, (_, index) => ({ kind: 'trio', cards: [card((index + 1) as Card['rank'])] })),
    loose: Array.from({ length: loose }, () => card(9)),
    outPoints: out ? 3 : 0,
    setPoints: 0,
    mirror: 0,
    wilds: 0,
    total,
  }
}

function result(out: number | null, seats: SeatScore[]): RoundScore {
  return { out, cover: card(2), trump: card(3), seats, points: seats.map((item) => item.total) }
}

describe('reveal', () => {
  it('shows the player who went out first, then the rest in turn order', () => {
    const steps = revealSteps(result(2, [seat(0, 1, 2), seat(1, 0, 4), seat(3, 4, 0, true)]))
    expect(steps.map((step) => [step.seat, step.loose])).toEqual([
      [2, false],
      [2, false],
      [2, false],
      [2, false],
      [0, false],
      [0, true],
      [1, true],
    ])
  })

  it('plays the happy jingle when you go out or match the best rival', () => {
    expect(roundMood(result(0, [seat(3, 4, 0, true), seat(5, 0, 12)]), 0)).toBe('happy')
    expect(roundMood(result(1, [seat(2, 0, 12), seat(3, 4, 0, true)]), 0)).toBe('sad')
    expect(roundMood(result(1, [seat(3, 0, 12), seat(3, 4, 0, true), seat(1, 0, 12)]), 0)).toBe('happy')
  })
})
