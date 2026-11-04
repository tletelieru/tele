import { useContext, useEffect, useEffectEvent, useState } from 'react'
import { BOTS, createRng } from '@tele/bots'
import type { Level } from '@tele/bots'
import { applyAction, createMatch, legalActions, startNextRound, viewFor } from '@tele/engine'
import type { Action, Card, DrawSource, MatchState, PlayerCount, Seat } from '@tele/engine'
import type { BotReply, BotRequest } from './botWorker'
import { recordFor, saveRecord } from './lib/history'
import { MOOD_JINGLE, revealSteps, roundMood } from './lib/reveal'
import type { Mood } from './lib/reveal'
import { clearSavedMatch, writeSavedMatch } from './lib/savedMatch'
import { ACTION_SOUNDS, MusicContext, REVEAL_SOUNDS, STARTER_SOUNDS, SoundContext, trackForMatch } from './lib/sound'

export const HUMAN = 0

let worker: Worker | null = null
let requestId = 0

function botWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  worker ??= new Worker(new URL('./botWorker.ts', import.meta.url), { type: 'module' })
  return worker
}

export const BOT_DRAW_DELAY = 550
export const BOT_DISCARD_DELAY = 700
export const BOT_PICK_MS = 450
export const DEAL_HOLD = 4000
export const STARTER_SPIN_MS = 2000
export const STARTER_ANNOUNCE_MS = 800
export const COVER_FLIGHT_MS = 600
export const REVEAL_STEP_MS = 350

export type StarterStage = 'spin' | 'announce' | 'done'

export interface Starter {
  stage: StarterStage
  spot: Seat | null
}

export function starterHops(players: number, dealer: Seat): number[] {
  const laps = players <= 3 ? 2 : 1
  const count = laps * players + dealer
  const weights = Array.from({ length: count }, (_, index) => 1 + 5 * (index / count) ** 2)
  const scale = STARTER_SPIN_MS / weights.reduce((sum, weight) => sum + weight, 0)
  return weights.map((weight) => Math.round(weight * scale))
}

function isReducedMotion(): boolean {
  if (typeof document === 'undefined') return false
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  return reduced || document.documentElement.classList.contains('reduce-motion')
}

export function endMood(state: MatchState): Mood {
  if (state.status === 'matchOver') return state.winner === HUMAN ? 'happy' : 'sad'
  return roundMood(state.results.at(-1)!, HUMAN)
}

function isFresh(state: MatchState): boolean {
  return state.status === 'playing' && state.round.moves.length === 0
}

function initialStarter(state: MatchState, restored: boolean): Starter {
  if (restored || !isFresh(state) || state.roundIndex > 0) return { stage: 'done', spot: null }
  if (isReducedMotion()) return { stage: 'announce', spot: state.round.dealer }
  return { stage: 'spin', spot: HUMAN }
}

export function useMatch(
  players: PlayerCount,
  target: number,
  seed: number,
  level: Level,
  restored: MatchState | null,
  onBotMove?: (action: Action, apply: () => void) => void,
) {
  const [state, setState] = useState(() => restored ?? createMatch({ players, target }, seed))
  const [rng] = useState(() => createRng(seed))
  const [starter, setStarter] = useState<Starter>(() => initialStarter(state, restored !== null))
  const [heldRound, setHeldRound] = useState<number | null>(null)
  const [revealed, setRevealed] = useState<number | null>(null)
  const [botPick, setBotPick] = useState<{ seat: Seat; source: DrawSource } | null>(null)
  const sound = useContext(SoundContext)
  const music = useContext(MusicContext)
  const starting = starter.stage !== 'done'
  const dealing = !starting && isFresh(state) && heldRound !== state.roundIndex
  const holding = starting || dealing

  function finishReveal(ended: MatchState) {
    setRevealed(null)
    sound?.jingle(MOOD_JINGLE[endMood(ended)])
  }

  function act(action: Action) {
    const next = applyAction(state, action)
    sound?.effect(ACTION_SOUNDS[action.type])
    if (next.status === 'matchOver') saveRecord(recordFor(next, seed, level))
    if (next.status !== 'playing') {
      if (isReducedMotion()) finishReveal(next)
      else setRevealed(-1)
    }
    setState(next)
  }

  const actFromBot = useEffectEvent((action: Action) => {
    const apply = () => {
      setBotPick(null)
      act(action)
    }
    if (onBotMove) onBotMove(action, apply)
    else apply()
  })
  const hop = useEffectEvent((spot: Seat) => {
    sound?.effect(STARTER_SOUNDS.hop)
    setStarter({ stage: 'spin', spot })
  })
  const land = useEffectEvent(() => {
    sound?.effect(STARTER_SOUNDS.stop)
    setStarter({ stage: 'announce', spot: state.round.dealer })
  })

  // eslint-disable-next-line local/no-effect -- persists the match in progress to localStorage
  useEffect(() => {
    if (state.status === 'matchOver') clearSavedMatch()
    else writeSavedMatch({ state, seed, level })
  }, [state, seed, level])

  // eslint-disable-next-line local/no-effect -- runs the timers of the starting player draw
  useEffect(() => {
    if (starter.stage === 'announce') {
      const timer = setTimeout(() => setStarter({ stage: 'done', spot: null }), STARTER_ANNOUNCE_MS)
      return () => clearTimeout(timer)
    }
    if (starter.stage !== 'spin') return
    const delays = starterHops(players, state.round.dealer)
    let elapsed = 0
    const timers = delays.map((delay, index) => {
      elapsed += delay
      const last = index === delays.length - 1
      return setTimeout(() => (last ? land() : hop((index + 1) % players)), elapsed)
    })
    return () => timers.forEach(clearTimeout)
  }, [starter.stage, players, state.round.dealer])

  const revealNext = useEffectEvent(() => {
    const steps = revealSteps(state.results.at(-1)!)
    const shown = (revealed ?? -1) + 1
    if (shown >= steps.length) return finishReveal(state)
    sound?.effect(REVEAL_SOUNDS.set)
    setRevealed(shown)
  })

  // eslint-disable-next-line local/no-effect -- runs the timers that reveal each set after someone goes out
  useEffect(() => {
    if (revealed === null) return
    const timer = setTimeout(revealNext, revealed < 0 ? COVER_FLIGHT_MS : REVEAL_STEP_MS)
    return () => clearTimeout(timer)
  }, [revealed])

  // eslint-disable-next-line local/no-effect -- runs bot turns with timers and the bot Web Worker
  useEffect(() => {
    if (starting) return
    if (dealing) {
      const timer = setTimeout(() => setHeldRound(state.roundIndex), DEAL_HOLD)
      return () => clearTimeout(timer)
    }
    const seat = state.round.turn
    if (state.status !== 'playing' || seat === HUMAN) return
    const delay = state.round.phase === 'draw' ? BOT_DRAW_DELAY : BOT_DISCARD_DELAY
    const view = viewFor(state, seat)
    const actions = legalActions(state, seat)
    let pickTimer: ReturnType<typeof setTimeout> | undefined
    const perform = (action: Action) => {
      if (action.type !== 'draw') return actFromBot(action)
      setBotPick({ seat, source: action.source })
      pickTimer = setTimeout(() => actFromBot(action), BOT_PICK_MS)
    }
    const worker = botWorker()
    if (!worker) {
      const timer = setTimeout(() => {
        perform(BOTS[level].choose(view, actions, rng))
      }, delay)
      return () => {
        clearTimeout(timer)
        clearTimeout(pickTimer)
      }
    }
    const id = (requestId += 1)
    let delayed = false
    let reply: Action | null = null
    const commit = () => {
      if (delayed && reply) perform(reply)
    }
    const timer = setTimeout(() => {
      delayed = true
      commit()
    }, delay)
    worker.onmessage = (event: MessageEvent<BotReply>) => {
      if (event.data.id !== id) return
      reply = event.data.action
      commit()
    }
    const botSeed = Math.floor(rng() * 2 ** 31)
    worker.postMessage({ id, level, view, legal: actions, seed: botSeed } satisfies BotRequest)
    return () => {
      clearTimeout(timer)
      clearTimeout(pickTimer)
      worker.onmessage = null
    }
  }, [state, starting, dealing, rng, level])

  const legal: Action[] = holding ? [] : legalActions(state, HUMAN)

  return {
    state,
    starter,
    revealed,
    holding,
    dealing,
    botPick,
    legal,
    draw: (source: DrawSource) => act({ type: 'draw', seat: HUMAN, source }),
    discard: (card: Card) => act({ type: 'discard', seat: HUMAN, card }),
    goOut: (cover: Card) => act({ type: 'goOut', seat: HUMAN, cover }),
    act,
    next: () => {
      const nextRound = startNextRound(state)
      music?.setTrack(trackForMatch(nextRound))
      setRevealed(null)
      setState(nextRound)
    },
  }
}
