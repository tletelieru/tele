import { distance, isMirror, isWild, sameCard, scoreHand, wildSpec } from '@tele/engine'
import type { Action, Card, PlayerView, WildSpec } from '@tele/engine'

export type Discard = Extract<Action, { type: 'discard' }>

export type GoOut = Extract<Action, { type: 'goOut' }>

export type Draw = Extract<Action, { type: 'draw' }>

export function remove(cards: Card[], card: Card): Card[] {
  const index = cards.findIndex((item) => sameCard(item, card))
  return [...cards.slice(0, index), ...cards.slice(index + 1)]
}

export function faceOf(card: Card, spec: WildSpec): string {
  return isWild(card, spec) ? 'wild' : `${card.rank}-${card.suit}`
}

export function uniqueDiscards(legal: Action[], spec: WildSpec): Discard[] {
  const seen = new Set<string>()
  return legal.filter((action): action is Discard => {
    if (action.type !== 'discard') return false
    const key = faceOf(action.card, spec)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function bestCover(view: PlayerView, legal: Action[]): GoOut | null {
  let best: GoOut | null = null
  let bestPoints = -Infinity
  for (const action of legal) {
    if (action.type !== 'goOut') continue
    const points = scoreHand(remove(view.hand, action.cover), view.trump, true).total
    if (points > bestPoints) {
      best = action
      bestPoints = points
    }
  }
  return best
}

export function bestDistanceAfter(cards: Card[], spec: WildSpec): number {
  return distance(cards, spec)
}

export function knownCard(view: PlayerView, source: Draw['source']): Card | null {
  if (source === 'discard') return view.discards.at(-1) ?? null
  if (source === 'trump') return view.trump
  if (source === 'mirror') return view.mirrorOnTrump
  return null
}

export function holdValue(cards: Card[], view: PlayerView, spec: WildSpec): number {
  return cards.reduce(
    (total, card) => total + (isWild(card, spec) ? 1 : 0) + (isMirror(card, view.trump) ? 1 : 0),
    0,
  )
}

function cyclicGap(a: number, b: number): number {
  const gap = Math.abs(a - b)
  return Math.min(gap, 13 - gap)
}

export function connections(card: Card, cards: Card[], spec: WildSpec): number {
  if (isWild(card, spec)) return 6
  let links = 0
  for (const other of cards) {
    if (other === card || isWild(other, spec)) continue
    if (other.rank === card.rank && other.suit !== card.suit) links += 2
    else if (other.rank === card.rank) links += 1
    else if (other.suit === card.suit && cyclicGap(other.rank, card.rank) === 1) links += 2
    else if (other.suit === card.suit && cyclicGap(other.rank, card.rank) === 2) links += 1
  }
  return links
}

export function specOf(view: PlayerView): WildSpec {
  return wildSpec(view.trump)
}
