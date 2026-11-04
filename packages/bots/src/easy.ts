import { distance, isWild } from '@tele/engine'
import type { Action, Card, PlayerView } from '@tele/engine'
import { bestCover, knownCard, remove, specOf, uniqueDiscards } from './hand'
import type { Bot, Rng } from './types'

const MISTAKE_RATE = 0.3

function bestAfterTaking(view: PlayerView, card: Card): number {
  const spec = specOf(view)
  const hand = [...view.hand, card]
  return Math.min(...hand.map((item) => distance(remove(hand, item), spec)))
}

export function drawByDistance(view: PlayerView, legal: Action[]): Action {
  const spec = specOf(view)
  const now = distance(view.hand, spec)
  for (const action of legal) {
    if (action.type !== 'draw' || action.source === 'deck') continue
    const card = knownCard(view, action.source)
    if (card && bestAfterTaking(view, card) < now) return action
  }
  return legal.find((action) => action.type === 'draw' && action.source === 'deck') ?? legal[0]
}

export const randomBot: Bot = {
  choose: (_view, legal, rng) => legal[Math.floor(rng() * legal.length)],
}

function choose(view: PlayerView, legal: Action[], rng: Rng): Action {
  const out = bestCover(view, legal)
  if (out) return out
  if (view.phase === 'draw') return drawByDistance(view, legal)
  const spec = specOf(view)
  const options = uniqueDiscards(legal, spec)
  if (rng() < MISTAKE_RATE) {
    const loose = options.filter((action) => !isWild(action.card, spec))
    if (loose.length > 0) return loose[Math.floor(rng() * loose.length)]
  }
  let best = options[0]
  let bestScore = Infinity
  for (const action of options) {
    const score = distance(remove(view.hand, action.card), spec) + rng() * 0.9
    if (score < bestScore) {
      best = action
      bestScore = score
    }
  }
  return best
}

export const easyBot: Bot = { choose }
