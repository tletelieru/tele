export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const

export type Suit = (typeof SUITS)[number]

export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

export type Rank = (typeof RANKS)[number]

export interface Card {
  suit: Suit
  rank: Rank
  copy: 0 | 1
}

export const DECK_SIZE = 104

export function cardId(card: Card): string {
  return `${card.rank}-${card.suit}-${card.copy}`
}

export function createDeck(): Card[] {
  return ([0, 1] as const).flatMap((copy) =>
    SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank, copy }))),
  )
}
