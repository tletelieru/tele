import type { Card } from '@tele/engine'
import { SUIT_ON_CARD, rankLabel } from '../lib/cards'
import type { CardMark } from '../lib/cards'
import { PixelIcon } from './PixelIcon'
import { SuitIcon } from './SuitIcon'

interface Props {
  card: Card
  highlight?: boolean
  compact?: boolean
  mark?: CardMark | null
}

const CROWN = ['#..#..#', '#.###.#', '#######', '#######']

const STAR = ['..#..', '.###.', '#####', '.###.', '.#.#.']

const MIRROR = ['.###.', '#...#', '#.#.#', '#...#', '.###.']

const FLAG = ['#####', '#####', '#####', '#....', '#....']

const MARK_ICON: Record<CardMark, string[]> = { wild: STAR, mirror: MIRROR, trump: FLAG }

const MARK_TONE: Record<CardMark, string> = {
  wild: 'text-gold',
  mirror: 'text-accent',
  trump: 'text-accent',
}

const JACK = 11
const KING = 13
const ACE = 1

function MarkIcon({ mark, className }: { mark: CardMark; className: string }) {
  return <PixelIcon rows={MARK_ICON[mark]} className={`${className} ${MARK_TONE[mark]}`} />
}

export function MiniCard({ card, highlight = false, compact = false, mark = null }: Props) {
  const tone = SUIT_ON_CARD[card.suit]
  const edge = highlight ? 'border-gold' : 'border-card-ink'
  const label = rankLabel(card.rank)
  const marked = mark ? `card-${mark}` : ''

  if (compact) {
    return (
      <span className="card-shadow block">
        <span
          className={`card-face relative flex h-11 w-7 flex-col items-center justify-center gap-0.5 border-2 font-pixel text-lg leading-none ${edge} ${tone} ${marked}`}
        >
          {label}
          <SuitIcon suit={card.suit} className="size-3.5" />
          {mark && <MarkIcon mark={mark} className="absolute top-0.5 right-0.5 size-1.5" />}
        </span>
      </span>
    )
  }

  const isFace = card.rank >= JACK && card.rank <= KING

  return (
    <span className="card-shadow block">
      <span
        className={`card-face relative block h-16 w-11 border-2 font-pixel leading-none ${edge} ${tone} ${marked}`}
      >
        {isFace && <span className="absolute inset-1 border border-gold/70 bg-gold/15" />}
        <span className="absolute top-0.5 left-1 text-lg leading-none">{label}</span>
        {mark && <MarkIcon mark={mark} className="absolute top-1 right-1 size-2.5" />}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 pt-1">
          {isFace && card.rank !== JACK && (
            <PixelIcon rows={CROWN} className="h-2 w-3.5 text-gold" />
          )}
          <SuitIcon suit={card.suit} className={card.rank === ACE ? 'size-8' : 'size-6'} />
        </span>
        <span className="absolute right-1 bottom-0.5 rotate-180 text-lg leading-none">{label}</span>
      </span>
    </span>
  )
}
