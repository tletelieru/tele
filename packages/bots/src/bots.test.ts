import { applyAction, createMatch, isWild, legalActions, startNextRound, viewFor, wildSpec } from '@tele/engine'
import type { Action, Card, MatchState, PlayerView, Rank, Suit } from '@tele/engine'
import { describe, expect, it } from 'vitest'
import { BOTS } from './index'
import { createRng } from './rng'
import type { Level } from './types'

const card = (rank: Rank, suit: Suit, copy: 0 | 1 = 0): Card => ({ rank, suit, copy })

const LEVELS: Level[] = ['easy', 'medium', 'hard']

const READY: Card[] = [
  card(1, 'hearts'),
  card(2, 'hearts'),
  card(3, 'hearts'),
  card(5, 'clubs'),
  card(5, 'diamonds'),
  card(5, 'spades'),
  card(9, 'spades'),
  card(10, 'spades'),
  card(11, 'spades'),
  card(6, 'hearts'),
  card(6, 'clubs'),
  card(8, 'diamonds'),
]

function viewWith(hand: Card[], phase: PlayerView['phase'], discards: Card[] = []): PlayerView {
  return {
    seat: 0,
    players: 3,
    target: 25,
    roundIndex: 0,
    dealer: 2,
    first: 0,
    turn: 0,
    phase,
    draws: 3,
    hand,
    handCounts: [hand.length, 12, 12],
    stockCount: 40,
    discards,
    trump: card(3, 'spades'),
    trumpOnTable: true,
    mirrorOnTrump: null,
    mirrorOffer: null,
    trumpHolder: null,
    moves: [],
    results: [],
    status: 'playing',
    out: null,
    winner: null,
  }
}

function playMatch(level: Level, players: 2 | 3 | 4 | 5 | 6, seed: number): MatchState {
  const rng = createRng(seed)
  let state = createMatch({ players, target: 10 }, seed)
  for (let step = 0; step < 20000 && state.status !== 'matchOver'; step++) {
    if (state.status === 'roundOver') {
      state = startNextRound(state)
      continue
    }
    const seat = state.round.turn
    const view = viewFor(state, seat)
    state = applyAction(state, BOTS[level].choose(view, legalActions(state, seat), rng))
  }
  return state
}

describe.each(LEVELS)('%s bot', (level) => {
  it('finishes a match from views only', () => {
    const state = playMatch(level, 3, 5)
    expect(state.status).toBe('matchOver')
    expect(state.winner).not.toBeNull()
  })

  it('takes the discard that lets it go out', () => {
    const view = viewWith(READY, 'draw', [card(6, 'diamonds')])
    const legal: Action[] = [
      { type: 'draw', seat: 0, source: 'deck' },
      { type: 'draw', seat: 0, source: 'discard' },
    ]
    const action = BOTS[level].choose(view, legal, createRng(1))
    expect(action).toEqual({ type: 'draw', seat: 0, source: 'discard' })
  })

  it('goes out when it can, covering the loose card', () => {
    const hand = [...READY, card(6, 'diamonds')]
    const legal: Action[] = [
      { type: 'goOut', seat: 0, cover: card(8, 'diamonds') },
      ...hand.map((item): Action => ({ type: 'discard', seat: 0, card: item })),
    ]
    const action = BOTS[level].choose(viewWith(hand, 'discard'), legal, createRng(2))
    expect(action).toEqual({ type: 'goOut', seat: 0, cover: card(8, 'diamonds') })
  })
})

describe('thinking bots', () => {
  it.each(['medium', 'hard'] as const)('%s takes the mirror resting on the trump', (level) => {
    const view = viewWith(READY.slice(0, 11).concat(card(13, 'clubs')), 'draw', [card(10, 'hearts')])
    view.mirrorOnTrump = card(3, 'spades', 1)
    view.mirrorOffer = 0
    const legal: Action[] = [
      { type: 'draw', seat: 0, source: 'deck' },
      { type: 'draw', seat: 0, source: 'discard' },
      { type: 'draw', seat: 0, source: 'mirror' },
    ]
    expect(BOTS[level].choose(view, legal, createRng(3))).toEqual({ type: 'draw', seat: 0, source: 'mirror' })
  })

  it.each(['medium', 'hard'] as const)('%s keeps its wild cards', (level) => {
    for (let seed = 0; seed < 20; seed++) {
      const state = createMatch({ players: 4 }, seed)
      const seat = state.round.turn
      const drawn = applyAction(state, { type: 'draw', seat, source: 'deck' })
      const view = viewFor(drawn, seat)
      const action = BOTS[level].choose(view, legalActions(drawn, seat), createRng(seed))
      if (action.type === 'discard') {
        const loose = view.hand.some((item) => !isWild(item, wildSpec(view.trump)))
        if (loose) expect(isWild(action.card, wildSpec(view.trump))).toBe(false)
      }
    }
  })

  it('is repeatable with the same seed', () => {
    expect(playMatch('hard', 2, 8)).toEqual(playMatch('hard', 2, 8))
  })
})
