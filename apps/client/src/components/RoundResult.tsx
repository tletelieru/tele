import type { RoundScore, SeatScore } from '@tele/engine'
import { useMessages } from '../i18n/messages'
import { cardKey, cardLabel, cardMark } from '../lib/cards'
import { MiniCard } from './MiniCard'

interface Props {
  names: string[]
  result: RoundScore
}

function chips(score: SeatScore, labels: ReturnType<typeof useMessages>['breakdown']) {
  return [
    { label: labels.out, value: score.outPoints },
    { label: labels.sets, value: score.setPoints },
    { label: labels.mirror, value: score.mirror },
    { label: labels.wilds, value: score.wilds },
  ].filter((chip) => chip.value > 0)
}

export function RoundResult({ names, result }: Props) {
  const t = useMessages()

  return (
    <ul className="flex flex-col gap-2">
      {result.seats.map((score, seat) => {
        const parts = chips(score, t.breakdown)
        const groups = [...score.melds.map((meld) => meld.cards), score.loose].filter(
          (cards) => cards.length > 0,
        )
        return (
          <li key={names[seat]} className="flex flex-col gap-1 pixel-box bg-raised p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-pixel text-xl leading-none">
                {names[seat]}
                {score.out && <span className="text-gold"> ★</span>}
              </span>
              <span className="font-pixel text-2xl leading-none text-gold">+{score.total}</span>
            </div>
            <p className="text-xs text-muted">
              {parts.length === 0
                ? t.breakdown.none
                : parts.map((part) => `${part.label} +${part.value}`).join(' · ')}
            </p>
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              {groups.map((cards, index) => (
                <span
                  key={index}
                  aria-label={cards.map(cardLabel).join(' ')}
                  className={`flex ${index === score.melds.length ? 'opacity-60' : ''}`}
                >
                  {cards.map((card) => (
                    <span key={cardKey(card)} className="-mr-2 last:mr-0">
                      <MiniCard card={card} compact mark={cardMark(card, result.trump)} />
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
