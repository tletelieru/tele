import { bestPartition, distance, isWild, nextSeat } from '@tele/engine'
import type { Action, Card, PlayerView, WildSpec } from '@tele/engine'
import { bestCover, connections, holdValue, knownCard, remove, specOf, uniqueDiscards } from './hand'
import { FACES, interest, liveCopies, readKnowledge } from './knowledge'
import type { Knowledge } from './knowledge'
import type { Bot, Rng } from './types'

export interface Style {
  outs: number
  candidates: number
  defense: number
  rivals: number
  noise: number
}

const DISTANCE_WEIGHT = 100
const POINT_WEIGHT = 4
const HOLD_WEIGHT = 8
const LINK_WEIGHT = 0.6
const OUTS_FROM = 2
const TAKE_MARGIN = 6

interface Context {
  view: PlayerView
  spec: WildSpec
  knowledge: Knowledge
  style: Style
}

function related(face: Card, cards: Card[], spec: WildSpec): boolean {
  if (isWild(face, spec)) return true
  return cards.some((card) => {
    if (isWild(card, spec)) return false
    if (card.rank === face.rank) return true
    if (card.suit !== face.suit) return false
    const gap = Math.abs(card.rank - face.rank)
    return Math.min(gap, 13 - gap) <= 2
  })
}

function liveOuts(cards: Card[], current: number, context: Context): number {
  let outs = 0
  const counted = new Set<string>()
  for (const face of FACES) {
    const copies = liveCopies(context.knowledge, face)
    if (copies === 0 || !related(face, cards, context.spec)) continue
    const key = isWild(face, context.spec) ? `wild-${face.rank}-${face.suit}` : `${face.rank}-${face.suit}`
    if (counted.has(key)) continue
    counted.add(key)
    if (distance([...cards, face], context.spec) < current) outs += copies
  }
  return outs
}

function evaluate(cards: Card[], context: Context): number {
  const { spec, view } = context
  const away = distance(cards, spec)
  const points = bestPartition(cards, spec).points
  const hold = holdValue(cards, view, spec)
  const links = cards.reduce((total, card) => total + connections(card, cards, spec), 0)
  return away * DISTANCE_WEIGHT - points * POINT_WEIGHT - hold * HOLD_WEIGHT - links * LINK_WEIGHT
}

function danger(card: Card, context: Context): number {
  const { view, knowledge, spec, style } = context
  const next = nextSeat(view.seat, view.players)
  let total = interest(knowledge, next, card, spec) * style.defense
  if (style.rivals > 0) {
    for (let seat = 0; seat < view.players; seat++) {
      if (seat === view.seat || seat === next) continue
      total += interest(knowledge, seat, card, spec) * style.rivals
    }
  }
  return total
}

function bestDiscard(hand: Card[], options: Card[], context: Context, rng: Rng): { card: Card; value: number } {
  const ranked = options
    .map((card) => {
      const rest = remove(hand, card)
      const away = distance(rest, context.spec)
      const value = evaluate(rest, context) + danger(card, context) + rng() * context.style.noise
      return { card, rest, away, value }
    })
    .sort((a, b) => a.value - b.value)
  const closest = Math.min(...ranked.map((option) => option.away))
  if (context.style.outs === 0 || closest === 0 || closest > OUTS_FROM) return ranked[0]
  const contenders = ranked.filter((option) => option.away === closest).slice(0, context.style.candidates)
  let best = contenders[0]
  let bestOuts = -1
  for (const option of contenders) {
    const outs = liveOuts(option.rest, closest, context)
    if (outs > bestOuts + context.style.outs) {
      best = option
      bestOuts = outs
    }
  }
  return best
}

function chooseDraw(legal: Action[], context: Context, rng: Rng): Action {
  const { view } = context
  const deck = legal.find((action) => action.type === 'draw' && action.source === 'deck')
  const current = evaluate(view.hand, context)
  let best: Action | undefined
  let bestValue = current - TAKE_MARGIN
  for (const action of legal) {
    if (action.type !== 'draw' || action.source === 'deck') continue
    const card = knownCard(view, action.source)
    if (!card) continue
    const hand = [...view.hand, card]
    if (distance(hand, context.spec) === 0) return action
    const others = hand.filter((item) => item !== card)
    const { value } = bestDiscard(hand, others, context, rng)
    if (value < bestValue) {
      best = action
      bestValue = value
    }
  }
  return best ?? deck ?? legal[0]
}

export function createThinkingBot(style: Style): Bot {
  return {
    choose(view, legal, rng) {
      const out = bestCover(view, legal)
      if (out) return out
      const spec = specOf(view)
      const context: Context = { view, spec, knowledge: readKnowledge(view), style }
      if (view.phase === 'draw') return chooseDraw(legal, context, rng)
      const options = uniqueDiscards(legal, spec)
      const { card } = bestDiscard(view.hand, options.map((action) => action.card), context, rng)
      return options.find((action) => action.card === card) ?? options[0]
    },
  }
}
