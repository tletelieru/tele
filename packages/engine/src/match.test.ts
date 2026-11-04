import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { DECK_SIZE, cardId, createDeck, sameCard } from './cards'
import type { Card, PlayerCount } from './cards'
import {
  applyAction,
  cardsInPlay,
  createMatch,
  decideWinner,
  legalActions,
  matchTotals,
  startNextRound,
} from './match'
import type { Action, MatchState } from './match'
import { distance, isMirror, isWild, meldKind, meldPoints, wildSpec } from './melds'
import { nextRandom } from './rng'
import { viewFor } from './view'

const seeds = fc.integer({ min: 0, max: 2 ** 31 - 1 })
const playerCounts = fc.constantFrom<PlayerCount>(2, 3, 4, 5, 6)

function randomAction(legal: Action[], rng: number): { action: Action; rng: number } {
  const random = nextRandom(rng)
  return { action: legal[Math.floor(random.value * legal.length)], rng: random.rng }
}

function greedyAction(state: MatchState, legal: Action[], rng: number): { action: Action; rng: number } {
  const out = legal.find((action) => action.type === 'goOut')
  if (out) return { action: out, rng }
  if (state.round.phase === 'draw') return randomAction(legal, rng)
  const spec = wildSpec(state.round.trump)
  const hand = state.round.hands[state.round.turn]
  const random = nextRandom(rng)
  let best = legal[0]
  let bestScore = Infinity
  for (const action of legal) {
    if (action.type !== 'discard') continue
    const rest = hand.filter((card) => !sameCard(card, action.card))
    const value = distance(rest, spec) + random.value * 0.5 * Number(sameCard(action.card, hand[0]))
    if (value < bestScore) {
      best = action
      bestScore = value
    }
  }
  return { action: best, rng: random.rng }
}

function play(
  start: MatchState,
  seed: number,
  steps: number,
  policy: typeof greedyAction,
  visit?: (state: MatchState) => void,
): MatchState {
  let state = start
  let rng = seed
  for (let step = 0; step < steps && state.status !== 'matchOver'; step++) {
    if (state.status === 'roundOver') {
      state = startNextRound(state)
      continue
    }
    visit?.(state)
    const legal = legalActions(state, state.round.turn)
    const chosen = policy(state, legal, rng)
    rng = chosen.rng
    state = applyAction(state, chosen.action)
  }
  visit?.(state)
  return state
}

const randomPolicy = (_state: MatchState, legal: Action[], rng: number) => randomAction(legal, rng)

function expectDeck(cards: Card[]) {
  expect(cards).toHaveLength(DECK_SIZE)
  expect(new Set(cards.map(cardId)).size).toBe(DECK_SIZE)
}

describe('deal', () => {
  it.each([2, 3, 4, 5, 6] as const)('deals 12 cards each with %i players', (players) => {
    const state = createMatch({ players }, 11)
    const { round } = state
    round.hands.forEach((hand) => expect(hand).toHaveLength(12))
    expect(round.stock).toHaveLength(DECK_SIZE - 1 - 12 * players)
    expect(round.trumpOnTable).toBe(true)
    expect(round.discards).toHaveLength(0)
    expect(round.turn).toBe(round.first)
    expectDeck(cardsInPlay(round))
  })

  it('lets only the first player take the trump on the first turn', () => {
    const state = createMatch({ players: 4 }, 3)
    const first = state.round.first
    const sources = legalActions(state, first).map((action) => action.type === 'draw' && action.source)
    expect(sources).toEqual(['deck', 'trump'])
    const taken = applyAction(state, { type: 'draw', seat: first, source: 'trump' })
    expect(taken.round.hands[first].some((card) => sameCard(card, state.round.trump))).toBe(true)
    expect(viewFor(taken, (first + 1) % 4).trumpHolder).toBe(first)
    const card = taken.round.hands[first][0]
    const passed = applyAction(taken, { type: 'discard', seat: first, card })
    const next = passed.round.turn
    expect(next).toBe((first + 1) % 4)
    const options = legalActions(passed, next).map((action) => action.type === 'draw' && action.source)
    expect(options).toEqual(['deck', 'discard'])
  })

  it('moves to the right after each discard', () => {
    const state = createMatch({ players: 3 }, 5)
    const first = state.round.first
    const drawn = applyAction(state, { type: 'draw', seat: first, source: 'deck' })
    expect(drawn.round.hands[first]).toHaveLength(13)
    const card = drawn.round.hands[first][4]
    const after = applyAction(drawn, { type: 'discard', seat: first, card })
    expect(after.round.turn).toBe((first + 1) % 3)
    expect(after.round.discards.at(-1)).toEqual(card)
  })
})

describe('dealer', () => {
  it('starts with the player to the right of the dealer and moves the deal each round', () => {
    for (const players of [2, 3, 4, 5, 6] as const) {
      const state = createMatch({ players }, players * 13)
      expect(state.round.first).toBe((state.round.dealer + 1) % players)
      expect(state.round.turn).toBe(state.round.first)
      const next = startNextRound({ ...state, status: 'roundOver' })
      expect(next.round.dealer).toBe((state.round.dealer + 1) % players)
      expect(next.round.first).toBe((next.round.dealer + 1) % players)
    }
  })

  it('picks the dealer from the seed', () => {
    const dealers = new Set(Array.from({ length: 40 }, (_, seed) => createMatch({ players: 4 }, seed).round.dealer))
    expect(dealers.size).toBe(4)
    expect(createMatch({ players: 4 }, 7).round.dealer).toBe(createMatch({ players: 4 }, 7).round.dealer)
  })
})

describe('mirror on the trump', () => {
  function withMirror(): { state: MatchState; mirror: Card; seat: number } {
    const base = createMatch({ players: 3 }, 2)
    const seat = base.round.first
    const drawn = applyAction(base, { type: 'draw', seat, source: 'deck' })
    const mirror: Card = { ...drawn.round.trump, copy: drawn.round.trump.copy === 0 ? 1 : 0 }
    const owner = drawn.round.hands.findIndex((hand) => hand.some((card) => sameCard(card, mirror)))
    const hands = drawn.round.hands.map((hand, index) => {
      if (index === seat) return [...hand.slice(1), mirror]
      if (index === owner) return [...hand.filter((card) => !sameCard(card, mirror)), drawn.round.hands[seat][0]]
      return hand
    })
    const stock = owner < 0 ? [...drawn.round.stock.filter((card) => !sameCard(card, mirror)), drawn.round.hands[seat][0]] : drawn.round.stock
    return { state: { ...drawn, round: { ...drawn.round, hands, stock } }, mirror, seat }
  }

  it('rests the discarded mirror on the trump for the next player only', () => {
    const { state, mirror, seat } = withMirror()
    expectDeck(cardsInPlay(state.round))
    const after = applyAction(state, { type: 'discard', seat, card: mirror })
    expectDeck(cardsInPlay(after.round))
    expect(after.round.discards.some((card) => sameCard(card, mirror))).toBe(false)
    expect(after.round.mirrorOnTrump).toEqual(mirror)
    const next = (seat + 1) % 3
    const sources = legalActions(after, next).map((action) => action.type === 'draw' && action.source)
    expect(sources).toContain('mirror')
    const taken = applyAction(after, { type: 'draw', seat: next, source: 'mirror' })
    expect(taken.round.hands[next].some((card) => sameCard(card, mirror))).toBe(true)
    expect(taken.round.mirrorOnTrump).toBeNull()
    expectDeck(cardsInPlay(taken.round))
  })

  it('leaves the mirror there when the next player passes on it', () => {
    const { state, mirror, seat } = withMirror()
    const after = applyAction(state, { type: 'discard', seat, card: mirror })
    const next = (seat + 1) % 3
    const drawn = applyAction(after, { type: 'draw', seat: next, source: 'deck' })
    const passed = applyAction(drawn, { type: 'discard', seat: next, card: drawn.round.hands[next][0] })
    expect(passed.round.mirrorOnTrump).toEqual(mirror)
    const later = (next + 1) % 3
    const sources = legalActions(passed, later).map((action) => action.type === 'draw' && action.source)
    expect(sources).not.toContain('mirror')
    expect(() => applyAction(passed, { type: 'draw', seat: later, source: 'mirror' })).toThrow()
  })
})

describe('match properties', () => {
  it('never loses or duplicates a card', () => {
    fc.assert(
      fc.property(playerCounts, seeds, (players, seed) => {
        play(createMatch({ players }, seed), seed, 400, randomPolicy, (state) => {
          expectDeck(cardsInPlay(state.round))
        })
      }),
      { numRuns: 60 },
    )
  })

  it('shuffles the discards back when the deck runs out', () => {
    const players = 6
    let reshuffled = false
    play(createMatch({ players }, 9), 9, 600, randomPolicy, (state) => {
      expectDeck(cardsInPlay(state.round))
      if (state.round.moves.some((move) => move.type === 'reshuffle')) reshuffled = true
    })
    expect(reshuffled).toBe(true)
  })

  it('scores every round by the table', () => {
    let rounds = 0
    fc.assert(
      fc.property(playerCounts, seeds, (players, seed) => {
        const end = play(createMatch({ players, target: 10 }, seed), seed, 3000, greedyAction)
        for (const result of end.results) {
          const spec = wildSpec(result.trump)
          result.seats.forEach((seat, index) => {
            const cards = [...seat.melds.flatMap((meld) => meld.cards), ...seat.loose]
            expect(cards).toHaveLength(12)
            seat.melds.forEach((meld) => expect(meldKind(meld.cards, spec)).not.toBeNull())
            const sets = seat.melds.reduce((sum, meld) => sum + meldPoints(meld.cards.length), 0)
            const mirror = cards.filter((card) => isMirror(card, result.trump)).length
            const wilds = cards.filter((card) => isWild(card, spec)).length
            const out = index === result.out
            expect(seat.out).toBe(out)
            if (out) expect(seat.loose).toHaveLength(0)
            expect(seat.setPoints).toBe(sets)
            expect(seat.total).toBe((out ? 3 : 0) + sets + mirror + wilds)
            expect(result.points[index]).toBe(seat.total)
          })
        }
        rounds += end.results.length
        if (end.status === 'matchOver') {
          const totals = matchTotals(end)
          expect(totals[end.winner!]).toBe(Math.max(...totals))
          expect(totals[end.winner!]).toBeGreaterThanOrEqual(10)
        }
      }),
      { numRuns: 25 },
    )
    expect(rounds).toBeGreaterThan(25)
  })

  it('rejects illegal actions', () => {
    fc.assert(
      fc.property(playerCounts, seeds, (players, seed) => {
        const state = play(createMatch({ players }, seed), seed, seed % 40, randomPolicy)
        if (state.status !== 'playing') return
        const { round } = state
        const other = (round.turn + 1) % players
        expect(() => applyAction(state, { type: 'draw', seat: other, source: 'deck' })).toThrow()
        const outside = createDeck().find(
          (card) => !round.hands[round.turn].some((held) => sameCard(held, card)),
        )!
        expect(() => applyAction(state, { type: 'discard', seat: round.turn, card: outside })).toThrow()
        expect(() => applyAction(state, { type: 'goOut', seat: round.turn, cover: outside })).toThrow()
        if (round.phase === 'discard') {
          expect(() => applyAction(state, { type: 'draw', seat: round.turn, source: 'deck' })).toThrow()
        } else {
          const card = round.hands[round.turn][0]
          expect(() => applyAction(state, { type: 'discard', seat: round.turn, card })).toThrow()
        }
      }),
      { numRuns: 100 },
    )
  })

  it('keeps hidden cards out of the views', () => {
    const state = createMatch({ players: 4 }, 21)
    const view = viewFor(state, 2)
    expect(view.hand).toEqual(state.round.hands[2])
    expect(JSON.stringify(view)).not.toContain('"stock"')
    expect(view.handCounts).toEqual([12, 12, 12, 12])
  })

  it('is serializable and repeatable', () => {
    const a = play(createMatch({ players: 3 }, 4), 4, 200, greedyAction)
    const b = play(createMatch({ players: 3 }, 4), 4, 200, greedyAction)
    expect(JSON.parse(JSON.stringify(a))).toEqual(b)
  })
})

describe('decideWinner', () => {
  it('waits until someone reaches the target', () => {
    expect(decideWinner([10, 24, 3], 25, 1)).toBeNull()
  })

  it('gives it to the highest total', () => {
    expect(decideWinner([26, 30, 3], 25, 0)).toBe(1)
  })

  it('breaks a tie in favor of whoever went out', () => {
    expect(decideWinner([27, 27, 3], 25, 0)).toBe(0)
  })

  it('plays another round when tied players did not go out', () => {
    expect(decideWinner([27, 27, 3], 25, 2)).toBeNull()
  })
})
