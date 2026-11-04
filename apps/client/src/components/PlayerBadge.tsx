import type { Card } from '@tele/engine'
import { useMessages } from '../i18n/messages'
import { MiniCard } from './MiniCard'

interface Props {
  name: string
  cards: number
  total: number
  dealer: boolean
  active: boolean
  trump: Card | null
  wide?: boolean
  spotlight?: boolean
}

export function PlayerBadge({
  name,
  cards,
  total,
  dealer,
  active,
  trump,
  wide = false,
  spotlight = false,
}: Props) {
  const t = useMessages()

  const label = `${name}, ${t.cardsLeft(cards)}, ${t.points(total)}`

  return (
    <div
      aria-current={active ? 'true' : undefined}
      aria-label={label}
      title={label}
      data-spotlight={spotlight || undefined}
      className={`relative flex min-w-0 items-center whitespace-nowrap pixel-box border-2 bg-surface px-1.5 py-0.5 text-xs leading-tight ${
        active ? 'turn-glow border-gold' : 'border-transparent'
      } ${wide ? 'gap-2' : 'w-full flex-col'} ${spotlight ? 'spotlight' : ''}`}
    >
      <span className="flex max-w-full items-center gap-1 font-pixel text-lg leading-none">
        <span className="truncate">{name}</span>
        {dealer && (
          <span title={t.dealer} className="text-gold">
            ●
          </span>
        )}
      </span>
      <span className="flex items-center gap-1 text-muted">
        <span aria-hidden="true" className="inline-block h-2.5 w-2 back-pattern" />
        {cards}
        <span key={total} className="score-pop inline-block text-ink">
          {t.points(total)}
        </span>
      </span>
      {trump && (
        <span
          title={t.heldTrump(name)}
          className={`trump-arrive absolute -top-2 -right-2 scale-75 ${wide ? 'from-above' : 'from-below'}`}
        >
          <MiniCard card={trump} compact mark="trump" />
        </span>
      )}
    </div>
  )
}
