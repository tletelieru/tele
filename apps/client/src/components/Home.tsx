import type { ReactNode } from 'react'
import type { Level } from '@tele/bots'
import { PLAYER_COUNTS, TARGETS } from '@tele/engine'
import type { Card, PlayerCount } from '@tele/engine'
import { useMessages } from '../i18n/messages'
import { PlayingCard } from './PlayingCard'

interface Props {
  level: Level
  players: PlayerCount
  target: number
  onLevel: (level: Level) => void
  onPlayers: (players: PlayerCount) => void
  onTarget: (target: number) => void
  onRules: () => void
  onHistory: () => void
  onStart: () => void
}

const FAN: { card: Card; tilt: number; lift: number }[] = [
  { card: { suit: 'spades', rank: 3, copy: 0 }, tilt: -8, lift: 10 },
  { card: { suit: 'clubs', rank: 4, copy: 0 }, tilt: 0, lift: 0 },
  { card: { suit: 'hearts', rank: 12, copy: 0 }, tilt: 8, lift: 10 },
]

const LEVELS: Level[] = ['easy', 'medium', 'hard']

interface ChoiceProps<T> {
  label: string
  hint?: string
  options: T[]
  value: T
  render: (option: T) => ReactNode
  onChange: (option: T) => void
}

function Choice<T extends string | number>({ label, hint, options, value, render, onChange }: ChoiceProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex w-full flex-col gap-1">
      <span className="text-center text-sm text-muted">
        {label}
        {hint && `: ${hint}`}
      </span>
      <div
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        className="grid gap-1 pixel-box bg-surface p-1"
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`pixel-box py-1.5 text-sm font-medium ${value === option ? 'bg-raised' : 'text-muted'}`}
          >
            {render(option)}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Home({
  level,
  players,
  target,
  onLevel,
  onPlayers,
  onTarget,
  onRules,
  onHistory,
  onStart,
}: Props) {
  const t = useMessages()
  const links = [
    { label: t.history, onClick: onHistory },
    { label: t.rules, onClick: onRules },
  ]

  return (
    <main className="flex flex-col items-center gap-5">
      <div aria-hidden="true" className="flex justify-center pt-6">
        {FAN.map(({ card, tilt, lift }) => (
          <PlayingCard
            key={`${card.suit}-${card.rank}`}
            card={card}
            tilt={tilt}
            lift={lift}
            front={tilt === 0}
          />
        ))}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-pixel text-6xl leading-none">{t.appName}</h1>
        <p className="text-muted">{t.tagline}</p>
      </div>
      <Choice
        label={t.difficulty}
        hint={t.levelHints[level]}
        options={LEVELS}
        value={level}
        render={(option) => t.levels[option]}
        onChange={onLevel}
      />
      <Choice
        label={t.players}
        options={PLAYER_COUNTS}
        value={players}
        render={(option) => <span className="font-pixel text-xl leading-none">{option}</span>}
        onChange={onPlayers}
      />
      <Choice
        label={t.target}
        options={TARGETS}
        value={target}
        render={(option) => t.targetPoints(option)}
        onChange={onTarget}
      />
      <button
        type="button"
        onClick={onStart}
        className="w-full pixel-box bg-accent py-3 font-pixel text-3xl leading-none text-on-accent"
      >
        {t.play}
      </button>
      <section className="flex w-full flex-col gap-2 pixel-box bg-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-pixel text-2xl leading-none">{t.howTitle}</h2>
          <div className="flex gap-1">
            {links.map(({ label, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="pixel-box bg-raised px-2 py-1 text-xs font-medium"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <ol className="flex flex-col gap-1.5">
          {t.howSteps.map((step, index) => (
            <li key={step} className="flex items-center gap-2 pixel-box bg-raised px-2 py-2 text-sm leading-tight">
              <span className="font-pixel text-xl leading-none text-gold">{index + 1}</span>
              <span className="min-w-0">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  )
}
