import type { Suit } from '@tele/engine'
import { PixelIcon } from './PixelIcon'

const BITMAPS: Record<Suit, string[]> = {
  clubs: [
    '...###...',
    '...###...',
    '.##.#.##.',
    '#########',
    '#########',
    '.##.#.##.',
    '....#....',
    '...###...',
    '..#####..',
  ],
  diamonds: [
    '....#....',
    '...###...',
    '..#####..',
    '.#######.',
    '#########',
    '.#######.',
    '..#####..',
    '...###...',
    '....#....',
  ],
  hearts: [
    '.##...##.',
    '####.####',
    '#########',
    '#########',
    '.#######.',
    '..#####..',
    '...###...',
    '....#....',
    '.........',
  ],
  spades: [
    '....#....',
    '...###...',
    '..#####..',
    '.#######.',
    '#########',
    '#########',
    '.##.#.##.',
    '....#....',
    '...###...',
  ],
}

export function SuitIcon({ suit, className }: { suit: Suit; className: string }) {
  return <PixelIcon rows={BITMAPS[suit]} className={className} />
}
