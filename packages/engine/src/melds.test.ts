import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { SUITS, cardId, createDeck } from './cards'
import type { Card, Rank, Suit } from './cards'
import {
  bestPartition,
  canPartition,
  coverOptions,
  distance,
  fullPartition,
  isMirror,
  isWild,
  meldKind,
  meldPoints,
  wildSpec,
} from './melds'
import type { Meld, Partition, WildSpec } from './melds'
import { nextRandom } from './rng'

const card = (rank: Rank, suit: Suit, copy: 0 | 1 = 0): Card => ({ rank, suit, copy })

const SPADES_3 = wildSpec(card(3, 'spades'))

function oracle(cards: Card[], spec: WildSpec, partial: boolean): number {
  const memo = new Map<number, number>()
  const full = (1 << cards.length) - 1
  const solve = (mask: number): number => {
    if (mask === 0) return 0
    const known = memo.get(mask)
    if (known !== undefined) return known
    const low = mask & -mask
    const rest = mask ^ low
    let best = partial ? solve(rest) : -Infinity
    for (let sub = rest; ; sub = (sub - 1) & rest) {
      const group = sub | low
      const members = cards.filter((_, index) => group & (1 << index))
      if (members.length >= 3 && meldKind(members, spec)) {
        const value = solve(mask ^ group)
        if (value > -Infinity) best = Math.max(best, value + meldPoints(members.length))
      }
      if (sub === 0) break
    }
    memo.set(mask, best)
    return best
  }
  return solve(full)
}

function sameCards(a: Card[], b: Card[]): boolean {
  return [...a.map(cardId)].sort().join() === [...b.map(cardId)].sort().join()
}

function checkPartition(partition: Partition, hand: Card[], spec: WildSpec) {
  partition.melds.forEach((meld: Meld) => expect(meldKind(meld.cards, spec)).not.toBeNull())
  expect(sameCards([...partition.melds.flatMap((meld) => meld.cards), ...partition.loose], hand)).toBe(
    true,
  )
}

function draw(rng: number, count: number, pool: Card[]): { cards: Card[]; rng: number } {
  const cards: Card[] = []
  let current = rng
  for (let index = 0; index < count && pool.length > 0; index++) {
    const random = nextRandom(current)
    current = random.rng
    cards.push(pool.splice(Math.floor(random.value * pool.length), 1)[0])
  }
  return { cards, rng: current }
}

function buildValidHand(seed: number): { hand: Card[]; spec: WildSpec } {
  let rng = seed
  const pick = (n: number) => {
    const random = nextRandom(rng)
    rng = random.rng
    return Math.floor(random.value * n)
  }
  const deck = createDeck()
  const trump = deck.splice(pick(deck.length), 1)[0]
  const spec = wildSpec(trump)
  const sizes = [
    [3, 3, 3, 3],
    [3, 4, 5],
    [4, 4, 4],
    [6, 6],
    [5, 7],
    [3, 3, 6],
    [12],
    [3, 9],
  ][pick(8)]
  const hand: Card[] = []
  const takeFrom = (match: (item: Card) => boolean): Card | null => {
    const options = deck.filter(match)
    if (options.length === 0) return null
    const chosen = options[pick(options.length)]
    deck.splice(deck.indexOf(chosen), 1)
    return chosen
  }
  for (const size of sizes) {
    const meld: Card[] = []
    const run = pick(2) === 0 && size <= 13
    if (run) {
      const suit = SUITS[pick(4)]
      const start = pick(13)
      for (let offset = 0; offset < size; offset++) {
        const rank = (((start + offset) % 13) + 1) as Rank
        const natural = takeFrom((item) => item.suit === suit && item.rank === rank)
        meld.push(natural ?? takeFrom((item) => isWild(item, spec)) ?? takeFrom(() => true)!)
      }
    } else {
      const rank = (pick(13) + 1) as Rank
      for (let index = 0; index < size; index++) {
        const natural = takeFrom((item) => item.rank === rank)
        meld.push(natural ?? takeFrom((item) => isWild(item, spec)) ?? takeFrom(() => true)!)
      }
    }
    if (pick(3) === 0) {
      const wild = takeFrom((item) => isWild(item, spec))
      if (wild) {
        const replaced = pick(meld.length)
        deck.push(meld[replaced])
        meld[replaced] = wild
      }
    }
    hand.push(...meld)
  }
  return { hand, spec }
}

const seeds = fc.integer({ min: 0, max: 2 ** 31 - 1 })

describe('meldKind', () => {
  it('recognizes trios with repeated suits and wild cards', () => {
    expect(meldKind([card(7, 'hearts'), card(7, 'hearts', 1), card(7, 'clubs')], SPADES_3)).toBe('trio')
    expect(meldKind([card(7, 'hearts'), card(4, 'clubs'), card(4, 'spades')], SPADES_3)).toBe('trio')
    expect(meldKind([card(7, 'hearts'), card(8, 'clubs')], SPADES_3)).toBeNull()
  })

  it('recognizes runs that wrap around the ace', () => {
    const wrap = [card(12, 'hearts'), card(13, 'hearts'), card(1, 'hearts'), card(2, 'hearts'), card(3, 'hearts')]
    expect(meldKind(wrap, SPADES_3)).toBe('run')
    expect(meldKind([card(5, 'hearts'), card(4, 'spades'), card(7, 'hearts')], SPADES_3)).toBe('run')
    expect(meldKind([card(5, 'hearts'), card(6, 'hearts'), card(8, 'hearts')], SPADES_3)).toBeNull()
    expect(meldKind([card(5, 'hearts'), card(6, 'diamonds'), card(7, 'hearts')], SPADES_3)).toBeNull()
  })

  it('takes the next rank in the trump color as wild', () => {
    const spec = wildSpec(card(13, 'diamonds'))
    expect(isWild(card(1, 'hearts'), spec)).toBe(true)
    expect(isWild(card(1, 'diamonds', 1), spec)).toBe(true)
    expect(isWild(card(1, 'clubs'), spec)).toBe(false)
    expect(isMirror(card(13, 'diamonds', 1), card(13, 'diamonds'))).toBe(true)
    expect(isMirror(card(13, 'diamonds'), card(13, 'diamonds'))).toBe(false)
  })
})

describe('solver', () => {
  it('partitions a hand of four trios and runs', () => {
    const hand = [
      card(12, 'hearts'),
      card(13, 'hearts'),
      card(1, 'hearts'),
      card(9, 'clubs'),
      card(9, 'clubs', 1),
      card(9, 'hearts'),
      card(5, 'diamonds'),
      card(4, 'spades'),
      card(7, 'diamonds'),
      card(2, 'clubs'),
      card(2, 'spades'),
      card(4, 'clubs'),
    ]
    const partition = fullPartition(hand, SPADES_3)
    expect(partition).not.toBeNull()
    checkPartition(partition!, hand, SPADES_3)
    expect(distance(hand, SPADES_3)).toBe(0)
  })

  it('scores long sets and concentrates spare wild cards', () => {
    const hand = [
      card(8, 'hearts'),
      card(8, 'clubs'),
      card(8, 'spades'),
      card(8, 'diamonds'),
      card(8, 'hearts', 1),
      card(4, 'spades'),
      card(4, 'clubs'),
    ]
    expect(bestPartition(hand, SPADES_3).points).toBe(3)
  })

  it('finds every valid cover card', () => {
    const hand = [
      card(1, 'hearts'),
      card(2, 'hearts'),
      card(3, 'hearts'),
      card(5, 'clubs'),
      card(5, 'diamonds'),
      card(5, 'spades'),
      card(9, 'spades'),
      card(10, 'spades'),
      card(11, 'spades'),
      card(12, 'spades'),
      card(6, 'hearts'),
      card(6, 'clubs'),
      card(6, 'diamonds'),
    ]
    const covers = coverOptions(hand, SPADES_3).map(cardId)
    expect(covers).toEqual([cardId(card(9, 'spades')), cardId(card(12, 'spades'))])
  })

  it('accepts every constructed valid hand', () => {
    fc.assert(
      fc.property(seeds, (seed) => {
        const { hand, spec } = buildValidHand(seed)
        if (oracle(hand, spec, false) === -Infinity) return
        const partition = fullPartition(hand, spec)
        expect(partition).not.toBeNull()
        checkPartition(partition!, hand, spec)
        expect(partition!.loose).toHaveLength(0)
        expect(partition!.points).toBe(oracle(hand, spec, false))
        expect(canPartition(hand, spec)).toBe(true)
        expect(distance(hand, spec)).toBe(0)
      }),
      { numRuns: 300 },
    )
  })

  it('matches the brute force on random and broken hands', () => {
    fc.assert(
      fc.property(seeds, fc.boolean(), (seed, broken) => {
        let { hand, spec } = buildValidHand(seed)
        if (broken) {
          const pool = createDeck().filter((item) => !hand.some((held) => cardId(held) === cardId(item)))
          const { cards } = draw(seed ^ 0x5bd1e995, 2, pool)
          hand = [...hand.slice(2), ...cards]
        } else {
          const { cards } = draw(seed, 12, createDeck())
          hand = cards
          spec = wildSpec(draw(seed ^ 77, 1, createDeck()).cards[0])
        }
        const exact = oracle(hand, spec, false)
        const partition = fullPartition(hand, spec)
        expect(partition === null).toBe(exact === -Infinity)
        expect(canPartition(hand, spec)).toBe(exact !== -Infinity)
        expect(distance(hand, spec) === 0).toBe(exact !== -Infinity)
        if (partition) expect(partition.points).toBe(exact)
        const best = bestPartition(hand, spec)
        checkPartition(best, hand, spec)
        expect(best.points).toBe(oracle(hand, spec, true))
      }),
      { numRuns: 300 },
    )
  })

  it('needs at most one card more after a good draw', () => {
    fc.assert(
      fc.property(seeds, (seed) => {
        const { hand, spec } = buildValidHand(seed)
        if (!canPartition(hand, spec)) return
        const pool = createDeck().filter((item) => !hand.some((held) => cardId(held) === cardId(item)))
        const { cards } = draw(seed, 1, pool)
        const thirteen = [...hand, ...cards]
        expect(distance(thirteen, spec)).toBe(0)
        expect(coverOptions(thirteen, spec).length).toBeGreaterThan(0)
        expect(distance(hand.slice(1), spec)).toBeLessThanOrEqual(1)
      }),
      { numRuns: 200 },
    )
  })

  it('is fast enough for bots', () => {
    let rng = 12345
    const started = performance.now()
    for (let index = 0; index < 400; index++) {
      const { cards, rng: next } = draw(rng, 13, createDeck())
      rng = next
      const spec = wildSpec(cards[12])
      distance(cards.slice(0, 12), spec)
      distance(cards, spec)
      bestPartition(cards.slice(0, 12), spec)
    }
    expect(performance.now() - started).toBeLessThan(4000)
  })
})
