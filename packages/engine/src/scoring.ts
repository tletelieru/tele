import type { Card, Seat } from './cards'
import { bestPartition, fullPartition, isMirror, isWild, wildSpec } from './melds'
import type { Meld } from './melds'

export const OUT_POINTS = 3

export interface SeatScore {
  out: boolean
  melds: Meld[]
  loose: Card[]
  outPoints: number
  setPoints: number
  mirror: number
  wilds: number
  total: number
}

export interface RoundScore {
  out: Seat | null
  cover: Card | null
  trump: Card
  seats: SeatScore[]
  points: number[]
}

export function scoreHand(hand: Card[], trump: Card, out: boolean): SeatScore {
  const spec = wildSpec(trump)
  const partition = (out && fullPartition(hand, spec)) || bestPartition(hand, spec)
  const outPoints = out ? OUT_POINTS : 0
  const mirror = hand.filter((card) => isMirror(card, trump)).length
  const wilds = hand.filter((card) => isWild(card, spec)).length
  return {
    out,
    melds: partition.melds,
    loose: partition.loose,
    outPoints,
    setPoints: partition.points,
    mirror,
    wilds,
    total: outPoints + partition.points + mirror + wilds,
  }
}

export function scoreHands(
  hands: Card[][],
  trump: Card,
  out: Seat | null,
  cover: Card | null,
): RoundScore {
  const seats = hands.map((hand, seat) => scoreHand(hand, trump, seat === out))
  return { out, cover, trump, seats, points: seats.map((seat) => seat.total) }
}
