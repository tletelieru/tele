import type { Card, Rank, Suit } from '@tele/engine'
import type { CardMark } from './cards'

export interface FigureCard {
  card: Card | null
  mark?: CardMark
}

export interface Figure {
  slide?: boolean
  groups: FigureCard[][]
  caption?: string
}

const SUIT: Record<string, Suit> = { c: 'clubs', d: 'diamonds', h: 'hearts', s: 'spades' }

const RANK: Record<string, Rank> = { A: 1, J: 11, Q: 12, K: 13 }

const MARK: Record<string, CardMark> = { '*': 'wild', '=': 'mirror', '!': 'trump' }

function parse(token: string): FigureCard {
  if (token === '#') return { card: null }
  const match = /^(10|[2-9AJQK])([cdhs])([*=!]?)$/.exec(token)!
  const rank = RANK[match[1]] ?? (Number(match[1]) as Rank)
  const card: Card = { rank, suit: SUIT[match[2]], copy: 0 }
  return match[3] ? { card, mark: MARK[match[3]] } : { card }
}

function groups(text: string): FigureCard[][] {
  return text.split('|').map((group) => group.trim().split(/\s+/).map(parse))
}

export const RULE_FIGURES: (Figure | null)[][] = [
  [
    null,
    { slide: true, groups: groups('3s!') },
    { groups: groups('3s! | 3s=') },
    { groups: groups('3s! | 4s* 4s* 4c* 4c*') },
  ],
  [
    { groups: groups('7h 7h 7c | Kd Ks Kc Kh') },
    { groups: groups('5d 6d 7d 8d | Qh Kh Ah 2h 3h') },
    { groups: groups('9c 4s* Jc | Kd Ks 4c*') },
  ],
  [
    null,
    null,
    { groups: groups('Ah 2h 3h | 5c 5d 5s | 9s 10s Js | 6h 6c 6d | #') },
    null,
    { groups: groups('3s! 3s=') },
  ],
  [
    null,
    { groups: groups('3s= | 4c* | 4s*') },
    { groups: groups('8h 8c 8s 8d 8h | 4d 5d 6d 7d 8d 9d'), caption: '+1 · +2' },
    null,
    null,
  ],
]
