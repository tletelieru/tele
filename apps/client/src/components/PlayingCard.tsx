import type { CSSProperties } from 'react'
import type { Card } from '@tele/engine'
import { SUIT_ON_CARD, rankLabel } from '../lib/cards'
import { SuitIcon } from './SuitIcon'

interface Props {
  card: Card
  tilt: number
  lift: number
  front?: boolean
}

export function PlayingCard({ card, tilt, lift, front = false }: Props) {
  const style = { '--tilt': `${tilt}deg`, '--lift': `${lift}px` } as CSSProperties
  const label = rankLabel(card.rank)

  return (
    <div style={style} className={`playing-card relative -mx-1 ${front ? 'z-10' : ''}`}>
      <div
        className={`card-face hero-card relative h-36 w-24 border-4 border-card-ink font-pixel sm:h-44 sm:w-30 ${
          SUIT_ON_CARD[card.suit]
        }`}
      >
        <span className="absolute inset-1.5 border-2 border-gold/50" />
        <span className="absolute top-2 left-3 flex flex-col items-center gap-0.5">
          <span className="text-3xl leading-none">{label}</span>
          <SuitIcon suit={card.suit} className="size-3.5" />
        </span>
        <span className="absolute inset-0 flex items-center justify-center">
          <SuitIcon suit={card.suit} className="size-9 sm:size-12" />
        </span>
        <span className="absolute right-3 bottom-2 flex rotate-180 flex-col items-center gap-0.5">
          <span className="text-3xl leading-none">{label}</span>
          <SuitIcon suit={card.suit} className="size-3.5" />
        </span>
      </div>
    </div>
  )
}
