import { DECK_SIZE, createDeck, sameCard, withoutCard } from './cards'
import type { Card, PlayerCount, Seat } from './cards'
import { coverOptions, isMirror, wildSpec } from './melds'
import { nextRandom, shuffle } from './rng'
import { scoreHands } from './scoring'
import type { RoundScore } from './scoring'

export const HAND_SIZE = 12

export const DEFAULT_TARGET = 25

export const TARGETS = [15, 25, 40]

export interface MatchConfig {
  players: PlayerCount
  target?: number
}

export type DrawSource = 'deck' | 'discard' | 'trump' | 'mirror'

export type Action =
  | { type: 'draw'; seat: Seat; source: DrawSource }
  | { type: 'discard'; seat: Seat; card: Card }
  | { type: 'goOut'; seat: Seat; cover: Card }

export type Move =
  | { type: 'draw'; seat: Seat; source: DrawSource; card: Card | null }
  | { type: 'discard'; seat: Seat; card: Card }
  | { type: 'goOut'; seat: Seat }
  | { type: 'reshuffle' }

export type Phase = 'draw' | 'discard'

export interface Round {
  dealer: Seat
  first: Seat
  trump: Card
  trumpOnTable: boolean
  mirrorOnTrump: Card | null
  mirrorOffer: Seat | null
  hands: Card[][]
  stock: Card[]
  discards: Card[]
  turn: Seat
  phase: Phase
  draws: number
  moves: Move[]
  out: Seat | null
  cover: Card | null
}

export type MatchStatus = 'playing' | 'roundOver' | 'matchOver'

export interface MatchState {
  players: PlayerCount
  target: number
  rng: number
  roundIndex: number
  round: Round
  results: RoundScore[]
  status: MatchStatus
  winner: Seat | null
}

export function nextSeat(seat: Seat, players: number): Seat {
  return (seat + 1) % players
}

function pick(rng: number, count: number): { value: number; rng: number } {
  const random = nextRandom(rng)
  return { value: Math.floor(random.value * count), rng: random.rng }
}

function cutAndSlide(cards: Card[], rng: number): { cards: Card[]; rng: number } {
  const shuffled = shuffle(cards, rng)
  if (shuffled.items.length < 2) return { cards: shuffled.items, rng: shuffled.rng }
  const cut = pick(shuffled.rng, shuffled.items.length - 1)
  const at = cut.value + 1
  return { cards: [...shuffled.items.slice(at), ...shuffled.items.slice(0, at)], rng: cut.rng }
}

function dealRound(players: PlayerCount, dealer: Seat, rng: number): { round: Round; rng: number } {
  const first = nextSeat(dealer, players)
  const { cards, rng: next } = cutAndSlide(createDeck(), rng)
  const [burned, trump, ...rest] = cards
  const stock = [...rest, burned]
  const hands: Card[][] = Array.from({ length: players }, () => [])
  for (let index = 0; index < HAND_SIZE * players; index++) {
    hands[(first + index) % players].push(stock[index])
  }
  return {
    round: {
      dealer,
      first,
      trump,
      trumpOnTable: true,
      mirrorOnTrump: null,
      mirrorOffer: null,
      hands,
      stock: stock.slice(HAND_SIZE * players),
      discards: [],
      turn: first,
      phase: 'draw',
      draws: 0,
      moves: [],
      out: null,
      cover: null,
    },
    rng: next,
  }
}

export function createMatch(config: MatchConfig, seed: number): MatchState {
  const { players } = config
  const start = pick(seed, players)
  const { round, rng } = dealRound(players, start.value, start.rng)
  return {
    players,
    target: config.target ?? DEFAULT_TARGET,
    rng,
    roundIndex: 0,
    round,
    results: [],
    status: 'playing',
    winner: null,
  }
}

export function startNextRound(state: MatchState): MatchState {
  if (state.status !== 'roundOver') throw new Error('The current round has not finished')
  const dealer = nextSeat(state.round.dealer, state.players)
  const { round, rng } = dealRound(state.players, dealer, state.rng)
  return { ...state, rng, round, roundIndex: state.roundIndex + 1, status: 'playing' }
}

function canDrawDeck(round: Round): boolean {
  return round.stock.length > 0 || round.discards.length > 1
}

export function legalActions(state: MatchState, seat: Seat): Action[] {
  const { round } = state
  if (state.status !== 'playing' || round.turn !== seat) return []
  if (round.phase === 'draw') {
    const actions: Action[] = []
    if (canDrawDeck(round)) actions.push({ type: 'draw', seat, source: 'deck' })
    if (round.discards.length > 0) actions.push({ type: 'draw', seat, source: 'discard' })
    if (round.draws === 0 && round.trumpOnTable) actions.push({ type: 'draw', seat, source: 'trump' })
    if (round.mirrorOnTrump && round.mirrorOffer === seat) actions.push({ type: 'draw', seat, source: 'mirror' })
    return actions
  }
  const hand = round.hands[seat]
  const covers = coverOptions(hand, wildSpec(round.trump))
  return [
    ...covers.map((cover): Action => ({ type: 'goOut', seat, cover })),
    ...hand.map((card): Action => ({ type: 'discard', seat, card })),
  ]
}

function sameAction(a: Action, b: Action): boolean {
  if (a.type !== b.type || a.seat !== b.seat) return false
  if (a.type === 'draw' && b.type === 'draw') return a.source === b.source
  if (a.type === 'discard' && b.type === 'discard') return sameCard(a.card, b.card)
  if (a.type === 'goOut' && b.type === 'goOut') return sameCard(a.cover, b.cover)
  return false
}

export function isLegal(state: MatchState, action: Action): boolean {
  return legalActions(state, action.seat).some((legal) => sameAction(legal, action))
}

function replaceHand(hands: Card[][], seat: Seat, hand: Card[]): Card[][] {
  return hands.map((current, index) => (index === seat ? hand : current))
}

function reshuffled(round: Round, rng: number): { round: Round; rng: number } {
  const top = round.discards.at(-1)!
  const { cards, rng: next } = cutAndSlide(round.discards.slice(0, -1), rng)
  return {
    round: { ...round, stock: cards, discards: [top], moves: [...round.moves, { type: 'reshuffle' }] },
    rng: next,
  }
}

function applyDraw(state: MatchState, seat: Seat, source: DrawSource): MatchState {
  let round = state.round
  let rng = state.rng
  if (source === 'deck' && round.stock.length === 0) ({ round, rng } = reshuffled(round, rng))
  const sources: Record<DrawSource, () => { card: Card; next: Partial<Round>; shown: Card | null }> = {
    deck: () => ({ card: round.stock[0], next: { stock: round.stock.slice(1) }, shown: null }),
    discard: () => {
      const card = round.discards.at(-1)!
      return { card, next: { discards: round.discards.slice(0, -1) }, shown: card }
    },
    trump: () => ({ card: round.trump, next: { trumpOnTable: false }, shown: round.trump }),
    mirror: () => ({ card: round.mirrorOnTrump!, next: { mirrorOnTrump: null }, shown: round.mirrorOnTrump }),
  }
  const { card, next, shown } = sources[source]()
  const move: Move = { type: 'draw', seat, source, card: shown }
  return {
    ...state,
    rng,
    round: {
      ...round,
      ...next,
      mirrorOffer: null,
      hands: replaceHand(round.hands, seat, [...round.hands[seat], card]),
      phase: 'discard',
      draws: round.draws + 1,
      moves: [...round.moves, move],
    },
  }
}

function applyDiscard(state: MatchState, seat: Seat, card: Card): MatchState {
  const { round } = state
  const mirror = isMirror(card, round.trump)
  const next = nextSeat(seat, state.players)
  return {
    ...state,
    round: {
      ...round,
      hands: replaceHand(round.hands, seat, withoutCard(round.hands[seat], card)),
      discards: mirror ? round.discards : [...round.discards, card],
      mirrorOnTrump: mirror ? card : round.mirrorOnTrump,
      mirrorOffer: mirror ? next : null,
      turn: next,
      phase: 'draw',
      moves: [...round.moves, { type: 'discard', seat, card }],
    },
  }
}

export function matchTotals(state: Pick<MatchState, 'players' | 'results'>): number[] {
  return Array.from({ length: state.players }, (_, seat) =>
    state.results.reduce((total, result) => total + result.points[seat], 0),
  )
}

export function leaders(totals: number[]): Seat[] {
  const best = Math.max(...totals)
  return totals.flatMap((total, seat) => (total === best ? [seat] : []))
}

export function decideWinner(totals: number[], target: number, out: Seat | null): Seat | null {
  if (!totals.some((total) => total >= target)) return null
  const top = leaders(totals)
  if (top.length === 1) return top[0]
  if (out !== null && top.includes(out)) return out
  return null
}

function applyGoOut(state: MatchState, seat: Seat, cover: Card): MatchState {
  const { round } = state
  const finished: Round = {
    ...round,
    hands: replaceHand(round.hands, seat, withoutCard(round.hands[seat], cover)),
    out: seat,
    cover,
    moves: [...round.moves, { type: 'goOut', seat }],
  }
  const results = [...state.results, scoreHands(finished.hands, round.trump, seat, cover)]
  const winner = decideWinner(matchTotals({ players: state.players, results }), state.target, seat)
  return {
    ...state,
    round: finished,
    results,
    winner,
    status: winner === null ? 'roundOver' : 'matchOver',
  }
}

export function applyAction(state: MatchState, action: Action): MatchState {
  if (!isLegal(state, action)) throw new Error('Illegal action')
  if (action.type === 'draw') return applyDraw(state, action.seat, action.source)
  if (action.type === 'discard') return applyDiscard(state, action.seat, action.card)
  return applyGoOut(state, action.seat, action.cover)
}

export function cardsInPlay(round: Round): Card[] {
  return [
    ...round.hands.flat(),
    ...round.stock,
    ...round.discards,
    ...(round.trumpOnTable ? [round.trump] : []),
    ...(round.mirrorOnTrump ? [round.mirrorOnTrump] : []),
    ...(round.cover ? [round.cover] : []),
  ]
}

export function isComplete(round: Round): boolean {
  return cardsInPlay(round).length === DECK_SIZE
}

export function liveScore(state: MatchState): RoundScore {
  const { round } = state
  return scoreHands(round.hands, round.trump, round.out, round.cover)
}

export function score(state: MatchState): RoundScore {
  if (state.status === 'playing') return liveScore(state)
  return state.results.at(-1)!
}
