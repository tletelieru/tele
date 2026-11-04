export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const

export type Suit = (typeof SUITS)[number]

export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

export type Rank = (typeof RANKS)[number]

export type Color = 'red' | 'black'

export type PlayerCount = 2 | 3 | 4 | 5 | 6

export type Seat = number

export interface Card {
  suit: Suit
  rank: Rank
  copy: 0 | 1
}

export const DECK_SIZE = 104

export const PLAYER_COUNTS: PlayerCount[] = [2, 3, 4, 5, 6]

export function cardId(card: Card): string {
  return `${card.rank}-${card.suit}-${card.copy}`
}

export function createDeck(): Card[] {
  return ([0, 1] as const).flatMap((copy) =>
    SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank, copy }))),
  )
}

export function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank && a.copy === b.copy
}

export function sameFace(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank
}

export function suitColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black'
}

export function nextRank(rank: Rank): Rank {
  return ((rank % 13) + 1) as Rank
}

export function withoutCard(cards: Card[], card: Card): Card[] {
  const index = cards.findIndex((item) => sameCard(item, card))
  if (index < 0) return cards
  return [...cards.slice(0, index), ...cards.slice(index + 1)]
}
