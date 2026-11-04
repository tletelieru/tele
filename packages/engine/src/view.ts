import { sameCard } from './cards'
import type { Card, PlayerCount, Seat } from './cards'
import type { MatchState, MatchStatus, Move, Phase } from './match'
import type { RoundScore } from './scoring'

export interface PlayerView {
  seat: Seat
  players: PlayerCount
  target: number
  roundIndex: number
  dealer: Seat
  first: Seat
  turn: Seat
  phase: Phase
  draws: number
  hand: Card[]
  handCounts: number[]
  stockCount: number
  discards: Card[]
  trump: Card
  trumpOnTable: boolean
  mirrorOnTrump: Card | null
  mirrorOffer: Seat | null
  trumpHolder: Seat | null
  moves: Move[]
  results: RoundScore[]
  status: MatchStatus
  out: Seat | null
  winner: Seat | null
}

export function trumpHolder(state: MatchState): Seat | null {
  const { round } = state
  if (round.trumpOnTable) return null
  const seat = round.hands.findIndex((hand) => hand.some((card) => sameCard(card, round.trump)))
  return seat < 0 ? null : seat
}

export function viewFor(state: MatchState, seat: Seat): PlayerView {
  const { round } = state
  return {
    seat,
    players: state.players,
    target: state.target,
    roundIndex: state.roundIndex,
    dealer: round.dealer,
    first: round.first,
    turn: round.turn,
    phase: round.phase,
    draws: round.draws,
    hand: round.hands[seat],
    handCounts: round.hands.map((hand) => hand.length),
    stockCount: round.stock.length,
    discards: round.discards,
    trump: round.trump,
    trumpOnTable: round.trumpOnTable,
    mirrorOnTrump: round.mirrorOnTrump,
    mirrorOffer: round.mirrorOffer,
    trumpHolder: trumpHolder(state),
    moves: round.moves,
    results: state.results,
    status: state.status,
    out: round.out,
    winner: state.winner,
  }
}
