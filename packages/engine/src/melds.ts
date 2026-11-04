import { SUITS, nextRank, suitColor } from './cards'
import type { Card, Color, Rank } from './cards'

export interface WildSpec {
  rank: Rank
  color: Color
}

export type MeldKind = 'trio' | 'run'

export interface Meld {
  kind: MeldKind
  cards: Card[]
}

export interface Partition {
  melds: Meld[]
  loose: Card[]
  points: number
}

export const MIN_MELD = 3

export const MAX_RUN = 13

export const TARGET_HAND = 12

type Mode = 'exists' | 'full' | 'best' | 'distance'

type Group =
  | { kind: 'trio'; rank: number; suits: number[]; nat: number; need: number }
  | { kind: 'run'; suit: number; start: number; length: number; mask: number; nat: number; need: number }

interface SearchResult {
  value: number
  groups: Group[] | null
}

interface Encoded {
  counts: Int8Array
  wilds: number
  pools: Card[][]
  wildCards: Card[]
}

const RANK_COUNT = 13

const SLOTS = 52

const SCORE_WEIGHT = 64

const CACHE_LIMIT = 50000

const ORDER: number[] = Array.from({ length: SLOTS }, (_, index) => {
  const rank = Math.floor(index / SUITS.length)
  const suit = index % SUITS.length
  return suit * RANK_COUNT + rank
})

const cache = new Map<string, SearchResult>()

export function wildSpec(trump: Card): WildSpec {
  return { rank: nextRank(trump.rank), color: suitColor(trump.suit) }
}

export function isWild(card: Card, spec: WildSpec): boolean {
  return card.rank === spec.rank && suitColor(card.suit) === spec.color
}

export function isMirror(card: Card, trump: Card): boolean {
  return card.suit === trump.suit && card.rank === trump.rank && card.copy !== trump.copy
}

export function meldPoints(size: number): number {
  return Math.max(0, size - 4)
}

export function partitionPoints(melds: Meld[]): number {
  return melds.reduce((total, meld) => total + meldPoints(meld.cards.length), 0)
}

function cyclicSpan(ranks: number[]): number {
  if (ranks.length === 0) return 0
  let widest = 0
  ranks.forEach((rank, index) => {
    const next = index + 1 < ranks.length ? ranks[index + 1] : ranks[0] + RANK_COUNT
    widest = Math.max(widest, next - rank)
  })
  return RANK_COUNT - widest + 1
}

export function meldKind(cards: Card[], spec: WildSpec): MeldKind | null {
  if (cards.length < MIN_MELD) return null
  const naturals = cards.filter((card) => !isWild(card, spec))
  if (naturals.every((card) => card.rank === naturals[0].rank)) return 'trio'
  if (cards.length > MAX_RUN) return null
  if (!naturals.every((card) => card.suit === naturals[0].suit)) return null
  const ranks = [...new Set(naturals.map((card) => card.rank - 1))].sort((a, b) => a - b)
  if (ranks.length !== naturals.length) return null
  return cyclicSpan(ranks) <= cards.length ? 'run' : null
}

function slot(card: Card): number {
  return SUITS.indexOf(card.suit) * RANK_COUNT + card.rank - 1
}

function encode(cards: Card[], spec: WildSpec): Encoded {
  const counts = new Int8Array(SLOTS)
  const pools: Card[][] = Array.from({ length: SLOTS }, () => [])
  const wildCards: Card[] = []
  for (const card of cards) {
    if (isWild(card, spec)) {
      wildCards.push(card)
      continue
    }
    const index = slot(card)
    counts[index] += 1
    pools[index].push(card)
  }
  return { counts, wilds: wildCards.length, pools, wildCards }
}

function groupSize(group: Group): number {
  return group.nat + group.need
}

function largest(groups: Group[]): number {
  let best = 0
  groups.forEach((group, index) => {
    if (groupSize(group) > groupSize(groups[best])) best = index
  })
  return best
}

function scoreGroups(groups: Group[], spare: number): number {
  if (groups.length === 0) return spare >= MIN_MELD ? meldPoints(spare) : 0
  const target = largest(groups)
  return groups.reduce(
    (total, group, index) => total + meldPoints(groupSize(group) + (index === target ? spare : 0)),
    0,
  )
}

function search(counts: Int8Array, wilds: number, mode: Mode, extra: number): SearchResult {
  const stack: Group[] = []
  let need = 0
  let dropped = 0
  let used = 0
  let best = mode === 'distance' ? Infinity : -Infinity
  let bestGroups: Group[] | null = null
  let done = false
  const flexible = mode === 'best' || mode === 'distance'

  const blocked = (more: number): boolean => {
    if (mode === 'distance') return Math.max(dropped - extra, need + more - wilds) >= best
    return need + more > wilds
  }

  const leafDistance = () => {
    if (dropped < extra) return
    const value = Math.max(dropped - extra, need - wilds)
    if (value >= best) return
    best = value
    bestGroups = stack.slice()
    if (best === 0) done = true
  }

  const leafPartition = () => {
    if (need > wilds) return
    const spare = wilds - need
    const absorbed = stack.length > 0 || spare >= MIN_MELD
    if (!absorbed && spare > 0 && mode !== 'best') return
    if (mode === 'exists') {
      best = 0
      bestGroups = stack.slice()
      done = true
      return
    }
    const points = scoreGroups(stack, spare)
    const value =
      mode === 'best' ? points * SCORE_WEIGHT + used + need + (absorbed ? spare : 0) : points
    if (value <= best) return
    best = value
    bestGroups = stack.slice()
  }

  const enter = (group: Group, from: number) => {
    stack.push(group)
    need += group.need
    used += group.nat
    dfs(from)
    stack.pop()
    need -= group.need
    used -= group.nat
  }

  const trios = (from: number, suit: number, rank: number) => {
    const avail = SUITS.map((_, other) => counts[other * RANK_COUNT + rank])
    const take = [0, 0, 0, 0]
    const walk = (index: number) => {
      if (done) return
      if (index < SUITS.length) {
        for (let amount = 0; amount <= avail[index]; amount++) {
          take[index] = amount
          walk(index + 1)
        }
        take[index] = 0
        return
      }
      const nat = 1 + take[0] + take[1] + take[2] + take[3]
      const more = Math.max(0, MIN_MELD - nat)
      if (blocked(more)) return
      const suits = [suit]
      take.forEach((amount, other) => {
        counts[other * RANK_COUNT + rank] -= amount
        for (let copy = 0; copy < amount; copy++) suits.push(other)
      })
      enter({ kind: 'trio', rank, suits, nat, need: more }, from)
      take.forEach((amount, other) => {
        counts[other * RANK_COUNT + rank] += amount
      })
    }
    walk(0)
  }

  const wrapped = (
    from: number,
    suit: number,
    rank: number,
    end: number,
    lowMask: number,
    lowNat: number,
    lowGaps: number,
  ) => {
    const base = suit * RANK_COUNT
    const fixedGaps = rank + lowGaps
    if (blocked(fixedGaps)) return
    const taken: number[] = []
    let highGaps = 0
    for (let start = RANK_COUNT - 1; start > end && !done; start--) {
      if (counts[base + start] === 0) {
        highGaps += 1
        if (blocked(fixedGaps + highGaps)) break
        continue
      }
      counts[base + start] -= 1
      taken.push(start)
      const head = RANK_COUNT - start
      const length = head + end + 1
      let mask = 0
      for (const position of taken) mask |= 1 << (position - start)
      for (let position = 0; position <= end; position++) {
        if (lowMask & (1 << position)) mask |= 1 << (head + position)
      }
      const nat = lowNat + taken.length
      const more = fixedGaps + highGaps + Math.max(0, MIN_MELD - length)
      if (!blocked(more)) enter({ kind: 'run', suit, start, length, mask, nat, need: more }, from)
    }
    for (const position of taken) counts[base + position] += 1
  }

  const runs = (from: number, suit: number, rank: number) => {
    const base = suit * RANK_COUNT
    const taken: number[] = []
    let gaps = 0
    let lowMask = 1 << rank
    wrapped(from, suit, rank, rank, lowMask, 1, 0)
    for (let end = rank + 1; end < RANK_COUNT && !done; end++) {
      if (counts[base + end] === 0) {
        gaps += 1
        if (blocked(gaps)) break
        continue
      }
      counts[base + end] -= 1
      taken.push(end)
      lowMask |= 1 << end
      const length = end - rank + 1
      const nat = 1 + taken.length
      const more = gaps + Math.max(0, MIN_MELD - length)
      if (!blocked(more)) {
        enter({ kind: 'run', suit, start: rank, length, mask: lowMask >> rank, nat, need: more }, from)
      }
      wrapped(from, suit, rank, end, lowMask, nat, gaps)
    }
    for (const position of taken) counts[base + position] += 1
  }

  const dfs = (from: number) => {
    if (done) return
    let position = from
    while (position < SLOTS && counts[ORDER[position]] === 0) position++
    if (position === SLOTS) {
      if (mode === 'distance') leafDistance()
      else leafPartition()
      return
    }
    const index = ORDER[position]
    const suit = Math.floor(index / RANK_COUNT)
    const rank = index % RANK_COUNT
    counts[index] -= 1
    trios(position, suit, rank)
    runs(position, suit, rank)
    if (flexible && !done) {
      dropped += 1
      if (mode !== 'distance' || !blocked(0)) dfs(position)
      dropped -= 1
    }
    counts[index] += 1
  }

  dfs(0)
  return { value: best, groups: bestGroups }
}

function cachedSearch(encoded: Encoded, mode: Mode, extra: number): SearchResult {
  const key = `${mode}${extra}${encoded.wilds}${encoded.counts.join('')}`
  const hit = cache.get(key)
  if (hit) return hit
  const result = search(encoded.counts, encoded.wilds, mode, extra)
  if (cache.size >= CACHE_LIMIT) cache.clear()
  cache.set(key, result)
  return result
}

function build(encoded: Encoded, groups: Group[]): Partition {
  const pools = encoded.pools.map((pool) => [...pool])
  const wilds = [...encoded.wildCards]
  const melds: Meld[] = groups.map((group) => {
    const cards: Card[] = []
    if (group.kind === 'trio') {
      for (const suit of group.suits) cards.push(pools[suit * RANK_COUNT + group.rank].pop()!)
    } else {
      for (let offset = 0; offset < group.length; offset++) {
        const position = (group.start + offset) % RANK_COUNT
        const natural = (group.mask & (1 << offset)) !== 0
        cards.push(natural ? pools[group.suit * RANK_COUNT + position].pop()! : wilds.pop()!)
      }
    }
    while (cards.length < MIN_MELD) cards.push(wilds.pop()!)
    return { kind: group.kind, cards }
  })
  if (melds.length > 0 && wilds.length > 0) {
    melds[largest(groups)].cards.push(...wilds.splice(0))
  }
  if (melds.length === 0 && wilds.length >= MIN_MELD) {
    melds.push({ kind: 'trio', cards: wilds.splice(0) })
  }
  const loose = [...pools.flat(), ...wilds]
  return { melds, loose, points: partitionPoints(melds) }
}

export function canPartition(cards: Card[], spec: WildSpec): boolean {
  return cachedSearch(encode(cards, spec), 'exists', 0).groups !== null
}

export function fullPartition(cards: Card[], spec: WildSpec): Partition | null {
  const encoded = encode(cards, spec)
  const { groups } = cachedSearch(encoded, 'full', 0)
  return groups ? build(encoded, groups) : null
}

export function bestPartition(cards: Card[], spec: WildSpec): Partition {
  const encoded = encode(cards, spec)
  const { groups } = cachedSearch(encoded, 'best', 0)
  return build(encoded, groups ?? [])
}

export function distance(cards: Card[], spec: WildSpec): number {
  const extra = Math.max(0, cards.length - TARGET_HAND)
  return cachedSearch(encode(cards, spec), 'distance', extra).value
}

function faceKey(card: Card, spec: WildSpec): string {
  return isWild(card, spec) ? 'wild' : `${card.rank}-${card.suit}`
}

export function coverOptions(hand: Card[], spec: WildSpec): Card[] {
  const verdicts = new Map<string, boolean>()
  return hand.filter((card, index) => {
    const key = faceKey(card, spec)
    if (!verdicts.has(key)) {
      const rest = [...hand.slice(0, index), ...hand.slice(index + 1)]
      verdicts.set(key, canPartition(rest, spec))
    }
    return verdicts.get(key)!
  })
}

export function clearMeldCache(): void {
  cache.clear()
}
