import type { CSSProperties, ReactNode } from 'react'
import type { Card, DrawSource, PlayerView } from '@tele/engine'
import { useMessages } from '../i18n/messages'
import { SUIT_ON_TABLE, cardLabel, slideBacks, wildCards } from '../lib/cards'
import { MiniCard } from './MiniCard'

const SLIDE_STEP_PX = 5
const FAN_DEG = 0.5
const SLIDE_DELAY_MS = 25
const CARD_WIDTH_PX = 44
const TRUMP_TO_DECK_PX = 76

const DISCARD_TO_DECK_PX = 160
const RESHUFFLE_DELAY_MS = 15

interface SlideProps {
  stock: number
  burned: boolean
  dealing: boolean
  reshuffling: boolean
  lifted: boolean
}

function dealRole(index: number, count: number, dealing: boolean): string {
  if (!dealing) return ''
  if (index === count - 1) return 'burn-card'
  if (index === count - 2) return 'trump-flight'
  return ''
}

function motion(dealing: boolean, reshuffling: boolean): string {
  if (dealing) return 'slide-in'
  return reshuffling ? 'reshuffle-in' : ''
}

function Slide({ stock, burned, dealing, reshuffling, lifted }: SlideProps) {
  const backs = slideBacks(burned ? stock - 1 : stock)
  const showBurned = burned && !dealing
  if (backs === 0 && !showBurned) return null
  const count = dealing ? backs + 2 : backs
  const width = `${Math.max(0, count - 1) * SLIDE_STEP_PX + CARD_WIDTH_PX}px`
  const burnedLifted = lifted && count === 0
  return (
    <span data-testid="slide" data-backs={backs} style={{ width }} className="relative isolate block h-16">
      {showBurned && (
        <span data-testid="burned" className="burned absolute top-0 left-0 block">
          <span
            data-lifted={burnedLifted || undefined}
            className={`card-shadow block h-16 w-11 back-pattern ${burnedLifted ? 'lifted' : ''}`}
          />
        </span>
      )}
      {Array.from({ length: count }, (_, index) => {
        const top = index === count - 1
        const style = {
          left: `${index * SLIDE_STEP_PX}px`,
          rotate: `${(index - count / 2) * FAN_DEG}deg`,
          '--from-x': `${(reshuffling ? DISCARD_TO_DECK_PX : 0) - index * SLIDE_STEP_PX}px`,
          '--to-x': `${-index * SLIDE_STEP_PX - (index === count - 2 ? TRUMP_TO_DECK_PX : 0)}px`,
          '--delay': `${index * (reshuffling ? RESHUFFLE_DELAY_MS : SLIDE_DELAY_MS)}ms`,
        } as CSSProperties
        return (
          <span
            key={index}
            style={style}
            data-lifted={lifted && top ? true : undefined}
            className={`card-shadow absolute top-0 block h-16 w-11 back-pattern ${motion(dealing, reshuffling)} ${dealRole(
              index,
              count,
              dealing,
            )} ${lifted && top ? 'lifted' : ''}`}
          />
        )
      })}
    </span>
  )
}

interface PileProps {
  source: DrawSource
  label: string
  caption: string
  action: string
  enabled: boolean
  picked: boolean
  onTap: () => void
  wide?: boolean
  children: ReactNode
}

function Pile({ source, label, caption, action, enabled, picked, onTap, wide = false, children }: PileProps) {
  return (
    <div className={`flex flex-col items-center gap-0.5 ${wide ? 'w-42' : ''}`}>
      <button
        type="button"
        data-pile
        data-source={source}
        aria-label={action}
        aria-pressed={picked}
        disabled={!enabled}
        onClick={onTap}
        className={`relative block touch-manipulation p-1 ${wide ? 'self-start pl-5' : ''}`}
      >
        {children}
      </button>
      <span className="pile-caption h-4 text-xs leading-4 whitespace-nowrap text-muted tabular-nums">
        {caption ? `${label} · ${caption}` : label}
      </span>
    </div>
  )
}

function EmptySlot({ label }: { label: string }) {
  return (
    <span className="flex h-16 w-11 items-center justify-center border-2 border-dashed border-line text-xs text-muted">
      {label}
    </span>
  )
}

interface DiscardTopProps {
  top: Card | undefined
  below: Card | undefined
  count: number
  covering: boolean
  lifted: boolean
  empty: string
}

function DiscardTop({ top, below, count, covering, lifted, empty }: DiscardTopProps) {
  if (covering) return <span data-testid="cover" className="cover-land block h-16 w-11 back-pattern" />
  if (!top) return <EmptySlot label={empty} />
  return (
    <span className="relative block">
      {below && (
        <span aria-hidden="true" className="absolute inset-0 block">
          <MiniCard card={below} />
        </span>
      )}
      <span data-lifted={lifted || undefined} data-discard-top className={`relative block ${lifted ? 'lifted' : ''}`}>
        <MiniCard key={count} card={top} />
      </span>
    </span>
  )
}

interface TrumpSpotProps {
  trump: Card
  onTable: boolean
  mirror: Card | null
  lifted: boolean
  dealing: boolean
  moves: number
}

function TrumpSpot({ trump, onTable, mirror, lifted, dealing, moves }: TrumpSpotProps) {
  return (
    <span className="relative block h-16 w-11">
      {onTable && (
        <span
          data-lifted={lifted && !mirror ? true : undefined}
          className={`block ${dealing ? 'trump-reveal' : ''} ${lifted && !mirror ? 'lifted' : ''}`}
        >
          <MiniCard card={trump} mark="trump" />
        </span>
      )}
      {mirror && (
        <span key={moves} data-testid="mirror-on-trump" className="mirror-land absolute top-1.5 left-2 block rotate-12">
          <span data-lifted={lifted || undefined} className={`block ${lifted ? 'lifted' : ''}`}>
            <MiniCard card={mirror} mark="mirror" />
          </span>
        </span>
      )}
    </span>
  )
}

interface Props {
  view: PlayerView
  covering: boolean
  dealing: boolean
  concealed: boolean
  enabled: Record<DrawSource, boolean>
  picked: DrawSource | null
  onTap: (source: DrawSource) => void
}

function SuitText({ card }: { card: Card }) {
  return <span className={`mr-1 last:mr-0 ${SUIT_ON_TABLE[card.suit]}`}>{cardLabel(card)}</span>
}

export function Piles({ view, covering, dealing, concealed, enabled, picked, onTap }: Props) {
  const t = useMessages()
  const top = view.discards.at(-1)
  const wilds = wildCards(view.trump)
  const trumpSource: DrawSource = view.mirrorOnTrump ? 'mirror' : 'trump'
  const trumpAction = view.mirrorOnTrump
    ? t.takeMirror(cardLabel(view.mirrorOnTrump))
    : t.takeTrump(cardLabel(view.trump))

  return (
    <div className={`flex flex-col items-center gap-2 ${concealed ? 'concealed' : ''} ${dealing ? 'pending-reveal' : ''}`}>
      <div className="flex items-start justify-center gap-2">
        <Pile
          source={trumpSource}
          label={t.marks.trump}
          caption=""
          action={trumpAction}
          enabled={enabled[trumpSource]}
          picked={picked === trumpSource}
          onTap={() => onTap(trumpSource)}
        >
          <TrumpSpot
            trump={view.trump}
            onTable={view.trumpOnTable}
            mirror={view.mirrorOnTrump}
            lifted={picked === trumpSource}
            dealing={dealing}
            moves={view.moves.length}
          />
        </Pile>
        <Pile
          source="deck"
          label={t.deck}
          caption={String(view.stockCount)}
          action={t.takeDeck}
          enabled={enabled.deck}
          picked={picked === 'deck'}
          onTap={() => onTap('deck')}
          wide
        >
          {view.stockCount > 0 ? (
            <Slide
              stock={view.stockCount}
              burned={!view.moves.some((move) => move.type === 'reshuffle')}
              dealing={dealing}
              reshuffling={view.moves.at(-2)?.type === 'reshuffle'}
              lifted={picked === 'deck'}
            />
          ) : (
            <span className="flex h-16 w-36 items-center justify-center">
              <EmptySlot label={t.emptyPile} />
            </span>
          )}
        </Pile>
        <Pile
          source="discard"
          label={t.discards}
          caption={view.discards.length > 0 ? String(view.discards.length) : ''}
          action={top ? t.takeDiscard(cardLabel(top)) : t.discards}
          enabled={enabled.discard}
          picked={picked === 'discard'}
          onTap={() => onTap('discard')}
        >
          <span className="pile-rest block">
            <DiscardTop top={top} below={view.discards.at(-2)} count={view.discards.length} covering={covering} lifted={picked === 'discard'} empty={t.emptyPile} />
          </span>
        </Pile>
      </div>
      <p className="flex flex-wrap items-center justify-center gap-x-3 text-sm">
        <span>
          <span className="text-muted">{t.wildsLabel}: </span>
          {wilds.map((card) => (
            <SuitText key={card.suit} card={card} />
          ))}
        </span>
        <span>
          <span className="text-muted">{t.marks.mirror}: </span>
          <SuitText card={view.trump} />
        </span>
      </p>
    </div>
  )
}
