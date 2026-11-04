import { useState } from 'react'
import { flushSync } from 'react-dom'
import type { Level } from '@tele/bots'
import { isMirror, matchTotals, sameCard, trumpHolder, viewFor } from '@tele/engine'
import type { Action, Card, DrawSource, MatchState, Move, PlayerCount, Seat } from '@tele/engine'
import { useMessages } from '../i18n/messages'
import type { Messages } from '../i18n/messages'
import { cardKey, cardLabel } from '../lib/cards'
import { flyTo, grabCard } from '../lib/flight'
import { recordFor, roundRows, saveRecord } from '../lib/history'
import { revealSteps } from '../lib/reveal'
import { clearSavedMatch } from '../lib/savedMatch'
import { HUMAN, useMatch } from '../useMatch'
import { BotHand } from './BotHand'
import { DealAnimation } from './DealAnimation'
import { Hand } from './Hand'
import { Overlay } from './Overlay'
import { Piles } from './Piles'
import { RevealBoard } from './RevealBoard'
import { PlayerBadge } from './PlayerBadge'
import { ResultEffect } from './ResultEffect'
import { RoundResult } from './RoundResult'
import { ScoreTable } from './ScoreTable'

type Selection =
  | { kind: 'card'; card: Card; at: number }
  | { kind: 'pile'; source: DrawSource; at: number }

interface Props {
  players: PlayerCount
  target: number
  seed: number
  level: Level
  restored: MatchState | null
  onExit: () => void
}

const FAN_REM = 17

function hasPlays(state: MatchState): boolean {
  return state.results.length > 0 || state.round.moves.length > 0
}

function saveAbandoned(state: MatchState, seed: number, level: Level): void {
  if (state.status === 'matchOver' || !hasPlays(state)) return
  saveRecord(recordFor(state, seed, level, true))
}

function describeMove(move: Move, trump: Card, names: string[], t: Messages): string {
  if (move.type === 'reshuffle') return t.reshuffled
  const name = names[move.seat]
  if (move.type === 'discard' && isMirror(move.card, trump)) return t.leftMirror(name, cardLabel(move.card))
  if (move.type === 'discard') return t.discarded(name, cardLabel(move.card))
  if (move.type === 'goOut') return t.wentOut(name)
  if (move.source === 'deck' || !move.card) return t.drewDeck(name)
  if (move.source === 'trump') return t.drewTrump(name, cardLabel(move.card))
  if (move.source === 'mirror') return t.drewMirror(name, cardLabel(move.card))
  return t.drewDiscard(name, cardLabel(move.card))
}

function lastNews(state: MatchState, names: string[], t: Messages): string {
  const move = state.round.moves.findLast((item) => item.type === 'reshuffle' || item.seat !== HUMAN)
  if (!move) return t.roundStart(names[state.round.first])
  return describeMove(move, state.round.trump, names, t)
}

function hasDraw(legal: Action[], source: DrawSource): boolean {
  return legal.some((action) => action.type === 'draw' && action.source === source)
}

function prompt(
  state: MatchState,
  legal: Action[],
  coverMode: boolean,
  hints: boolean,
  names: string[],
  t: Messages,
): string {
  if (state.status !== 'playing') return ''
  if (coverMode) return hints ? t.coverPrompt : t.coverPromptFree
  if (state.round.turn !== HUMAN) return t.waiting(names[state.round.turn])
  if (legal.length === 0) return ''
  if (state.round.phase === 'draw') return hasDraw(legal, 'trump') ? t.firstPrompt : t.drawPrompt
  const canOut = hints && legal.some((action) => action.type === 'goOut')
  return canOut ? t.outPrompt : t.discardPrompt
}

function pickedCard(source: DrawSource): Element | null {
  return document.querySelector(`[data-source="${source}"] [data-lifted]`)
}

function lastOf(selector: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).at(-1) ?? null
}

function discardTop(): HTMLElement | null {
  return document.querySelector('[data-discard-top]')
}

function botMove(action: Action, apply: () => void) {
  const fan = `[data-seat="${action.seat}"] .fan-card`
  if (action.type === 'draw') {
    const grabbed = grabCard(pickedCard(action.source))
    flushSync(apply)
    flyTo(grabbed, lastOf(fan))
    return
  }
  if (action.type !== 'discard') return apply()
  const from = lastOf(fan)?.getBoundingClientRect()
  flushSync(apply)
  const top = discardTop()
  flyTo(grabCard(top, from), top)
}

export function Table({ players, target, seed, level, restored, onExit }: Props) {
  const t = useMessages()
  const { state, starter, revealed, holding, dealing, botPick, legal, draw, discard, goOut, next } = useMatch(
    players,
    target,
    seed,
    level,
    restored,
    botMove,
  )
  const [coverMode, setCoverMode] = useState(false)
  const [rejected, setRejected] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const hints = level === 'easy'
  const [scoresOpen, setScoresOpen] = useState(false)
  const [exitOpen, setExitOpen] = useState(false)
  const { round } = state
  const names = Array.from({ length: players }, (_, seat) => (seat === HUMAN ? t.you : t.bot(seat)))
  const totals = matchTotals(state)
  const holder = trumpHolder(state)
  const view = viewFor(state, HUMAN)
  const opponents = Array.from({ length: players - 1 }, (_, index) => players - 1 - index)
  const active = (seat: Seat) => state.status === 'playing' && !holding && round.turn === seat
  const canDiscard = legal.some((action) => action.type === 'discard')
  const canGoOut = hints ? legal.some((action) => action.type === 'goOut') : canDiscard
  const tryCover = (card: Card) => {
    const legalCover = legal.some((action) => action.type === 'goOut' && sameCard(action.cover, card))
    if (!legalCover) {
      setRejected(true)
      return
    }
    setCoverMode(false)
    setRejected(false)
    goOut(card)
  }
  const revealing = revealed !== null
  const ended = state.status !== 'playing' && !revealing
  const result = state.results.at(-1)
  const humanWon = state.winner === HUMAN
  const rows = roundRows(state)

  const badge = (seat: Seat, wide = false) => (
    <PlayerBadge
      name={names[seat]}
      cards={round.hands[seat].length}
      total={totals[seat]}
      dealer={round.dealer === seat}
      active={active(seat)}
      trump={holder === seat ? round.trump : null}
      wide={wide}
      spotlight={starter.stage !== 'done' && starter.spot === seat}
    />
  )

  const leave = () => {
    saveAbandoned(state, seed, level)
    clearSavedMatch()
    onExit()
  }

  const outLine = () => {
    if (!result || result.out === null) return ''
    const who = result.out === HUMAN ? t.youOut : t.outBy(names[result.out])
    return result.cover ? `${who}, ${t.coveredWith(cardLabel(result.cover))}` : who
  }

  const promptText = () => {
    if (rejected) return t.notSets
    if (coverMode && !hints) return t.coverPromptFree
    if (!hints) return ''
    return prompt(state, legal, coverMode, hints, names, t)
  }

  const news = () => {
    if (starter.stage === 'spin') return ''
    if (starter.stage === 'announce') return t.deals(names[round.dealer])
    return lastNews(state, names, t)
  }

  const humanReady = !holding && legal.length > 0
  const concealed = starter.stage !== 'done'

  const fresh = selection !== null && selection.at === round.moves.length
  const selected = fresh && selection.kind === 'card' ? selection.card : null
  const pickedPile = fresh && selection.kind === 'pile' ? selection.source : null
  const drawable = (source: DrawSource) => !coverMode && hasDraw(legal, source)
  const enabledPiles: Record<DrawSource, boolean> = {
    deck: drawable('deck'),
    discard: drawable('discard'),
    trump: drawable('trump'),
    mirror: drawable('mirror'),
  }
  const tapPile = (source: DrawSource) => {
    if (pickedPile === source) {
      const grabbed = grabCard(pickedCard(source))
      flushSync(() => {
        setSelection(null)
        draw(source)
      })
      flyTo(grabbed, lastOf('[data-card] > span'))
      return
    }
    setSelection({ kind: 'pile', source, at: round.moves.length })
  }
  const selectCard = (card: Card | null) =>
    setSelection(card ? { kind: 'card', card, at: round.moves.length } : null)

  const toggleCover = () => {
    setRejected(false)
    setCoverMode(!coverMode)
  }

  const goOutButton = {
    label: coverMode ? t.cancel : t.goOut,
    enabled: coverMode || canGoOut,
    glow: hints && canGoOut && !coverMode,
  }

  const topBar = [
    { label: t.scoreTitle, onClick: () => setScoresOpen(true) },
    { label: t.exit, onClick: () => setExitOpen(true) },
  ]

  return (
    <main
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('button')) setSelection(null)
      }}
      className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1.5 overflow-x-clip overflow-y-auto overscroll-contain">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setScoresOpen(true)}
          className="min-w-0 flex-1 pixel-box bg-surface px-3 py-1.5 text-left"
        >
          <span className="font-pixel text-xl leading-none">{t.roundLabel(state.roundIndex + 1)}</span>
          <span className="block truncate text-xs text-muted">
            {t.target} {t.targetPoints(state.target)}
          </span>
        </button>
        {topBar.map(({ label, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className="pixel-button bg-raised px-3 py-1 text-ink"
          >
            {label}
          </button>
        ))}
      </div>

      <div
        style={{ gridTemplateColumns: `repeat(${opponents.length}, minmax(0, 1fr))` }}
        className="grid gap-1"
      >
        {opponents.map((seat) => (
          <div key={seat} data-seat={seat} className="flex min-w-0 flex-col items-center gap-1">
            {badge(seat)}
            <BotHand
              key={`${state.roundIndex}-${seat}-${starter.stage}`}
              concealed={concealed}
              cards={round.hands[seat].length}
              active={active(seat)}
              width={FAN_REM / opponents.length}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-[1_0_auto] flex-col items-center justify-center gap-1.5 pixel-box bg-surface/60 p-1.5">
        <p aria-live="polite" className="h-5 w-full truncate text-center text-sm text-gold">
          {news()}
        </p>
        {revealing && revealed >= 0 && result ? (
          <RevealBoard names={names} steps={revealSteps(result).slice(0, revealed + 1)} trump={round.trump} />
        ) : (
        <Piles
          view={view}
          covering={revealing}
          dealing={dealing}
          concealed={concealed}
          enabled={enabledPiles}
          picked={pickedPile ?? botPick?.source ?? null}
          onTap={tapPile}
        />
        )}
      </div>

      <Hand
        key={state.roundIndex}
        header={badge(HUMAN, true)}
        actions={
          <button
            type="button"
            disabled={!goOutButton.enabled}
            onClick={toggleCover}
            className={`w-full pixel-box py-2 font-pixel text-xl leading-none ${
              goOutButton.enabled ? 'bg-accent text-on-accent' : 'bg-raised text-muted opacity-60'
            } ${goOutButton.glow ? 'pile-ready' : ''}`}
          >
            {goOutButton.label}
          </button>
        }
        selected={selected}
        onSelect={selectCard}
        hand={round.hands[HUMAN]}
        trump={round.trump}
        legal={legal}
        dealing={dealing}
        concealed={concealed}
        coverMode={coverMode && canGoOut}
        onDiscard={(card) => {
          const grabbed = grabCard(document.querySelector(`[data-card="${cardKey(card)}"] > span`))
          flushSync(() => {
            setSelection(null)
            discard(card)
          })
          flyTo(grabbed, discardTop())
        }}
        hints={hints}
        onCover={tryCover}
      />
      <p
        aria-live="polite"
        data-testid="prompt"
        data-ready={humanReady}
        className="line-clamp-2 h-8 shrink-0 text-center text-xs leading-4 font-medium text-gold"
      >
        {promptText()}
      </p>

      {dealing && <DealAnimation players={players} first={round.first} />}

      {exitOpen && (
        <Overlay title={t.exitTitle} onClose={() => setExitOpen(false)}>
          <p className="font-pixel text-xl leading-tight text-muted">{t.exitBody}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setExitOpen(false)}
              className="pixel-button bg-raised py-2.5 text-ink"
            >
              {t.keepPlaying}
            </button>
            <button type="button" onClick={leave} className="pixel-button bg-rose-700 py-2.5 text-white">
              {t.exitConfirm}
            </button>
          </div>
        </Overlay>
      )}

      {scoresOpen && (
        <Overlay title={t.scoreTitle} onClose={() => setScoresOpen(false)}>
          <ScoreTable names={names} rounds={rows} target={state.target} />
          <button
            type="button"
            onClick={() => setScoresOpen(false)}
            className="pixel-box bg-raised py-2 font-medium"
          >
            {t.close}
          </button>
        </Overlay>
      )}

      {ended && state.status === 'roundOver' && result && (
        <Overlay title={t.roundFinished(state.roundIndex + 1)}>
          <p className="text-center font-pixel text-2xl leading-none text-gold">{outLine()}</p>
          <RoundResult names={names} result={result} />
          <ScoreTable names={names} rounds={rows} target={state.target} />
          <button
            type="button"
            onClick={() => {
              setCoverMode(false)
              next()
            }}
            className="pixel-box bg-accent py-2 font-medium text-on-accent"
          >
            {t.nextRound}
          </button>
        </Overlay>
      )}

      {ended && state.status === 'matchOver' && <ResultEffect won={humanWon} />}

      {ended && state.status === 'matchOver' && result && state.winner !== null && (
        <Overlay title={t.matchFinished}>
          <p
            className={`text-center font-pixel text-3xl leading-none text-gold ${
              humanWon ? 'result-win' : 'result-lose'
            }`}
          >
            {humanWon ? t.youWon(totals[HUMAN]) : t.winner(names[state.winner], totals[state.winner])}
          </p>
          <p className="text-center text-sm text-muted">{outLine()}</p>
          <RoundResult names={names} result={result} />
          <ScoreTable names={names} rounds={rows} target={state.target} />
          <button type="button" onClick={onExit} className="pixel-box bg-accent py-2 font-medium text-on-accent">
            {t.backHome}
          </button>
        </Overlay>
      )}
    </main>
  )
}
