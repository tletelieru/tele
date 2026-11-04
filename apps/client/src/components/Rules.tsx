import { useState } from 'react'
import { useLocale, useMessages } from '../i18n/messages'
import { rulesText } from '../i18n/rules'
import { RULE_FIGURES } from '../lib/ruleFigures'
import type { Figure } from '../lib/ruleFigures'
import { MiniCard } from './MiniCard'
import { Overlay } from './Overlay'

const SLIDE_BACKS = 8
const SLIDE_STEP_PX = 4

function RuleFigure({ figure }: { figure: Figure }) {
  return (
    <div aria-hidden="true" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-4">
      {figure.slide && (
        <span className="relative block h-11 w-14">
          {Array.from({ length: SLIDE_BACKS }, (_, index) => (
            <span
              key={index}
              style={{ left: `${index * SLIDE_STEP_PX}px` }}
              className="absolute top-0 block h-11 w-7 back-pattern"
            />
          ))}
        </span>
      )}
      {figure.groups.map((group, index) => (
        <span key={index} className="flex">
          {group.map(({ card, mark }, position) => (
            <span key={position} className="-mr-1.5 last:mr-0">
              {card ? (
                <MiniCard card={card} compact mark={mark ?? null} />
              ) : (
                <span className="card-shadow block h-11 w-7 back-pattern" />
              )}
            </span>
          ))}
        </span>
      ))}
      {figure.caption && <span className="font-pixel text-xl leading-none text-gold">{figure.caption}</span>}
    </div>
  )
}

export function Rules({ onClose }: { onClose: () => void }) {
  const t = useMessages()
  const text = rulesText[useLocale()]
  const [tab, setTab] = useState(0)
  const section = text.sections[tab]
  const figures = RULE_FIGURES[tab] ?? []

  return (
    <Overlay title={t.rules} parchment onClose={onClose}>
      <div className="grid grid-cols-4 gap-1">
        {text.sections.map(({ tab: label }, index) => (
          <button
            key={label}
            type="button"
            aria-pressed={tab === index}
            onClick={() => setTab(index)}
            className={`pixel-box py-1.5 text-sm ${tab === index ? 'bg-accent text-on-accent' : 'bg-raised'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-3 text-sm leading-tight">
        {section.rules.map((rule, index) => (
          <li key={rule} className="flex flex-col gap-1.5">
            <span className="flex gap-2">
              <span aria-hidden="true" className="mt-1 size-2 shrink-0 bg-gold" />
              {rule}
            </span>
            {figures[index] && <RuleFigure figure={figures[index]} />}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose} className="pixel-box bg-raised py-2">
        {t.close}
      </button>
    </Overlay>
  )
}
