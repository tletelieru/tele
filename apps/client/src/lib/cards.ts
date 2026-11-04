import { SUITS, bestPartition, cardId, isMirror, isWild, sameCard, wildSpec } from '@tele/engine'
import type { Card, Rank, Suit } from '@tele/engine'

export type SortMode = 'rank' | 'suit' | 'sets'

export type CardMark = 'wild' | 'mirror' | 'trump'

export const SORT_MODES: SortMode[] = ['rank', 'suit', 'sets']

export const SUIT_SYMBOL: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

const FACE: Partial<Record<Rank, string>> = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }

const HAND_SUITS: Suit[] = ['clubs', 'hearts', 'spades', 'diamonds']

export const SUIT_ON_CARD: Record<Suit, string> = {
  clubs: 'text-card-clubs',
  diamonds: 'text-card-diamonds',
  hearts: 'text-card-hearts',
  spades: 'text-card-spades',
}

export const SUIT_ON_TABLE: Record<Suit, string> = {
  clubs: 'text-table-clubs',
  diamonds: 'text-table-diamonds',
  hearts: 'text-table-hearts',
  spades: 'text-table-spades',
}

export function cardKey(card: Card): string {
  return cardId(card)
}

export function rankLabel(rank: Rank): string {
  return FACE[rank] ?? String(rank)
}

export function cardLabel(card: Card): string {
  return `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}`
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const result = [...items]
  const [item] = result.splice(from, 1)
  result.splice(to, 0, item)
  return result
}

export function formatPoints(value: number): string {
  if (value > 0) return `+${value}`
  if (value < 0) return `−${Math.abs(value)}`
  return '0'
}

export function cardMark(card: Card, trump: Card): CardMark | null {
  if (isWild(card, wildSpec(trump))) return 'wild'
  if (isMirror(card, trump)) return 'mirror'
  if (sameCard(card, trump)) return 'trump'
  return null
}

export function wildCards(trump: Card): Card[] {
  const spec = wildSpec(trump)
  return SUITS.filter((suit) => isWild({ suit, rank: spec.rank, copy: 0 }, spec)).map((suit) => ({
    suit,
    rank: spec.rank,
    copy: 0,
  }))
}

export function meldGroups(hand: Card[], trump: Card): Map<string, number> {
  const groups = new Map<string, number>()
  if (hand.length === 0) return groups
  bestPartition(hand, wildSpec(trump)).melds.forEach((meld, index) => {
    meld.cards.forEach((card) => groups.set(cardKey(card), index))
  })
  return groups
}

function byRank(a: Card, b: Card): number {
  return a.rank - b.rank || HAND_SUITS.indexOf(a.suit) - HAND_SUITS.indexOf(b.suit) || a.copy - b.copy
}

function bySuit(a: Card, b: Card): number {
  return HAND_SUITS.indexOf(a.suit) - HAND_SUITS.indexOf(b.suit) || a.rank - b.rank || a.copy - b.copy
}

export function sortHand(hand: Card[], mode: SortMode, trump: Card): Card[] {
  if (mode === 'rank') return [...hand].sort(byRank)
  if (mode === 'suit') return [...hand].sort(bySuit)
  const { melds, loose } = bestPartition(hand, wildSpec(trump))
  return [...melds.flatMap((meld) => meld.cards), ...[...loose].sort(bySuit)]
}

const CARDS_PER_BACK = 4

const MAX_BACKS = 21

export function slideBacks(stock: number): number {
  return Math.min(MAX_BACKS, Math.ceil(stock / CARDS_PER_BACK))
}
