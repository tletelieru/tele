import type { Card, Seat } from '@tele/engine'
import { cardKey, cardLabel, cardMark } from '../lib/cards'
import type { RevealStep } from '../lib/reveal'
import { MiniCard } from './MiniCard'

interface Props {
  names: string[]
  steps: RevealStep[]
  trump: Card
}

export function RevealBoard({ names, steps, trump }: Props) {
  const seats = steps.reduce<Seat[]>((order, step) => (order.includes(step.seat) ? order : [...order, step.seat]), [])

  return (
    <ul data-testid="reveal" className="no-scrollbar flex w-full flex-col gap-1.5 overflow-y-auto">
      {seats.map((seat) => (
        <li key={seat} className="flex flex-col gap-1 pixel-box bg-raised px-2 py-1.5">
          <span className="font-pixel text-lg leading-none">{names[seat]}</span>
          <div className="flex flex-wrap gap-x-2 gap-y-1">
            {steps
              .filter((step) => step.seat === seat)
              .map((step, index) => (
                <span
                  key={index}
                  data-step
                  aria-label={step.cards.map(cardLabel).join(' ')}
                  className={`score-pop flex ${step.loose ? 'opacity-60' : ''}`}
                >
                  {step.cards.map((card) => (
                    <span key={cardKey(card)} className="-mr-2 last:mr-0">
                      <MiniCard card={card} compact mark={cardMark(card, trump)} />
                    </span>
                  ))}
                </span>
              ))}
          </div>
        </li>
      ))}
    </ul>
  )
}
