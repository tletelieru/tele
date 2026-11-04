import { RANKS, SUITS, isWild, sameCard } from '@tele/engine'
import type { Card, PlayerView, Seat, WildSpec } from '@tele/engine'

export interface Knowledge {
  unseen: Map<string, number>
  held: Card[][]
  dropped: Card[][]
}

export const FACES: Card[] = SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank, copy: 0 as const })))

export function faceKey(card: Card): string {
  return `${card.rank}-${card.suit}`
}

export function readKnowledge(view: PlayerView): Knowledge {
  const held: Card[][] = Array.from({ length: view.players }, () => [])
  const dropped: Card[][] = Array.from({ length: view.players }, () => [])
  for (const move of view.moves) {
    if (move.type === 'draw' && move.card) held[move.seat].push(move.card)
    if (move.type === 'discard') {
      dropped[move.seat].push(move.card)
      const index = held[move.seat].findIndex((card) => sameCard(card, move.card))
      if (index >= 0) held[move.seat].splice(index, 1)
    }
  }
  const unseen = new Map(FACES.map((face) => [faceKey(face), 2]))
  const see = (card: Card) => unseen.set(faceKey(card), Math.max(0, unseen.get(faceKey(card))! - 1))
  view.hand.forEach(see)
  view.discards.forEach(see)
  if (view.trumpOnTable) see(view.trump)
  if (view.mirrorOnTrump) see(view.mirrorOnTrump)
  held.forEach((cards, seat) => {
    if (seat !== view.seat) cards.forEach(see)
  })
  return { unseen, held, dropped }
}

export function liveCopies(knowledge: Knowledge, face: Card): number {
  return knowledge.unseen.get(faceKey(face)) ?? 0
}

function near(a: Card, b: Card): boolean {
  if (a.rank === b.rank) return true
  if (a.suit !== b.suit) return false
  const gap = Math.abs(a.rank - b.rank)
  return Math.min(gap, 13 - gap) <= 2
}

export function interest(knowledge: Knowledge, seat: Seat, card: Card, spec: WildSpec): number {
  if (isWild(card, spec)) return 3
  const wanted = knowledge.held[seat].filter((item) => near(item, card)).length
  const refused = knowledge.dropped[seat].filter(
    (item) => item.rank === card.rank || (item.suit === card.suit && near(item, card)),
  ).length
  return wanted * 2 - Math.min(refused, 2) * 0.5
}
