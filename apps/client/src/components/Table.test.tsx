import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRng, easyBot } from '@tele/bots'
import { cardId, createMatch, isMirror, legalActions, viewFor } from '@tele/engine'
import type { Action, Card } from '@tele/engine'
import App from '../App'
import { readHistory } from '../lib/history'
import { readSavedMatch } from '../lib/savedMatch'
import { revealSteps } from '../lib/reveal'
import { COVER_FLIGHT_MS, DEAL_HOLD, REVEAL_STEP_MS, STARTER_ANNOUNCE_MS, STARTER_SPIN_MS, starterHops } from '../useMatch'

const STEP_MS = 800

const STARTER_MS = STARTER_SPIN_MS + STARTER_ANNOUNCE_MS

function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    act(() => {
      vi.advanceTimersByTime(Math.min(50, ms - elapsed))
    })
  }
}

function button(name: string | RegExp) {
  return screen.queryByRole('button', { name })
}

function cardButton(card: Card): HTMLElement {
  const hand = screen.getByRole('region', { name: 'Your hand' })
  return hand.querySelector(`[data-card="${cardId(card)}"]`) as HTMLElement
}

const DRAW_LABELS: Record<string, RegExp> = {
  deck: /^Take a card from the deck$/,
  discard: /^Take the discard/,
  trump: /^Take the trump/,
  mirror: /^Take the mirror/,
}

function perform(action: Action) {
  if (action.type === 'draw') {
    const pile = button(DRAW_LABELS[action.source])!
    fireEvent.click(pile)
    fireEvent.click(pile)
    return
  }
  if (action.type === 'discard') {
    fireEvent.click(cardButton(action.card))
    fireEvent.click(cardButton(action.card))
    return
  }
  fireEvent.click(button('Go out')!)
  fireEvent.click(cardButton(action.cover))
}

function takeTurn(rng: () => number): boolean {
  if (button('Back to start')) return false
  const next = button('Next round')
  if (next) {
    fireEvent.click(next)
    return true
  }
  const saved = readSavedMatch()
  const state = saved?.state
  const legal = state ? legalActions(state, 0) : []
  const ready = screen.getByTestId('prompt').dataset.ready === 'true'
  if (!state || legal.length === 0 || !ready) {
    advance(STEP_MS)
    return true
  }
  perform(easyBot.choose(viewFor(state, 0), legal, rng))
  return true
}

function waitForMyDraw() {
  for (let step = 0; step < 200; step++) {
    const state = readSavedMatch()?.state
    const ready = screen.getByTestId('prompt').dataset.ready === 'true'
    if (state && ready && state.round.turn === 0 && state.round.phase === 'draw') return
    advance(100)
  }
  throw new Error('never got a turn')
}

function start(players: number, level = 'easy', target = '15') {
  localStorage.setItem('bot-level', level)
  localStorage.setItem('match-target', target)
  render(<App />)
  const group = screen.getByRole('group', { name: 'Players' })
  fireEvent.click(within(group).getByRole('button', { name: String(players) }))
  fireEvent.click(screen.getByRole('button', { name: 'Play' }))
}

describe('Table', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-03T12:00:00Z'))
    localStorage.clear()
    localStorage.setItem('preferred-lang', 'en')
    document.documentElement.className = ''
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it.each([2, 3, 4, 5, 6])('deals 12 cards and seats %i players', (players) => {
    start(players)
    const hand = screen.getByRole('region', { name: 'Your hand' })
    expect(hand.querySelectorAll('[data-card]')).toHaveLength(12)
    expect(screen.getAllByLabelText(/, 12 cards,/)).toHaveLength(players)
  })

  it('plays a full match against the bots and saves it to the history', () => {
    start(2)
    const rng = createRng(3)
    let steps = 0
    while (takeTurn(rng) && steps < 6000) steps += 1
    expect(button('Back to start')).not.toBeNull()
    expect(screen.getByText('Match finished')).toBeTruthy()
    const [record] = readHistory()
    expect(record.players).toBe(2)
    expect(Math.max(...record.totals)).toBeGreaterThanOrEqual(15)
    expect(readSavedMatch()).toBeNull()
  }, 120000)

  it('restores the match after a reload', () => {
    start(3)
    advance(4000)
    const saved = readSavedMatch()!
    cleanup()
    render(<App />)
    const hand = screen.getByRole('region', { name: 'Your hand' })
    expect(hand.querySelectorAll('[data-card]').length).toBe(saved.state.round.hands[0].length)
  })

  it('rejects a cover that does not leave sets on medium', () => {
    start(2, 'medium')
    waitForMyDraw()
    fireEvent.click(button(/^Take a card from the deck$/)!)
    fireEvent.click(button(/^Take a card from the deck$/)!)
    const state = readSavedMatch()!.state
    const covers = legalActions(state, 0).filter((action) => action.type === 'goOut')
    if (covers.length > 0) return
    const goOut = button('Go out')!
    expect(goOut.hasAttribute('disabled')).toBe(false)
    fireEvent.click(goOut)
    fireEvent.click(cardButton(state.round.hands[0][0]))
    expect(screen.getByText("Those cards don't form sets.")).toBeTruthy()
    expect(readSavedMatch()!.state.round.phase).toBe('discard')
  })

  it('draws who deals before dealing and lands on the engine choice', () => {
    start(4)
    const first = readSavedMatch()!.state.round.dealer
    const name = first === 0 ? 'You' : `Bot ${first}`
    expect(document.querySelectorAll('[data-spotlight]')).toHaveLength(1)
    advance(STARTER_SPIN_MS - 100)
    expect(screen.queryByText(`Deals: ${name}`)).toBeNull()
    advance(150)
    expect(screen.getByText(`Deals: ${name}`)).toBeTruthy()
    const spot = document.querySelector('[data-spotlight]')!
    expect(spot.textContent).toContain(name)
    expect(readSavedMatch()!.state.round.moves).toHaveLength(0)
    advance(STARTER_ANNOUNCE_MS)
    expect(document.querySelectorAll('[data-spotlight]')).toHaveLength(0)
    expect(screen.queryByText(`Deals: ${name}`)).toBeNull()
  })

  it('starts with an empty table and lets the cards land after the draw', () => {
    start(3)
    const hand = screen.getByRole('region', { name: 'Your hand' })
    const grid = () => hand.querySelector('[data-card]')!.parentElement!
    expect(grid().className).toContain('concealed')
    expect(document.querySelector('.concealed [data-testid=slide]')).not.toBeNull()
    expect(document.querySelectorAll('.fan-in.concealed')).toHaveLength(2)
    advance(STARTER_MS + 200)
    expect(grid().className).not.toContain('concealed')
    expect(document.querySelector('.concealed [data-testid=slide]')).toBeNull()
    expect(document.querySelector('.pending-reveal [data-testid=slide]')).not.toBeNull()
    expect(document.querySelectorAll('.fan-in.concealed')).toHaveLength(0)
    expect(hand.querySelectorAll('.deal-in')).toHaveLength(12)
    expect(document.querySelectorAll('.slide-in').length).toBeGreaterThan(0)
    expect(document.querySelector('.trump-reveal')).not.toBeNull()
    expect(document.querySelector('.burn-card')).not.toBeNull()
  })

  it('hops at least one full lap, slowing down', () => {
    for (const players of [2, 3, 4, 5, 6]) {
      for (let first = 0; first < players; first++) {
        const hops = starterHops(players, first)
        expect(hops.length).toBeGreaterThanOrEqual(players)
        expect(hops.length % players).toBe(first)
        expect(hops.at(-1)!).toBeGreaterThan(hops[0])
        expect(Math.abs(hops.reduce((sum, hop) => sum + hop, 0) - STARTER_SPIN_MS)).toBeLessThan(20)
      }
    }
  })

  it('shows the starter at once with reduced motion and skips it when restored', () => {
    localStorage.setItem('reduce-motion', 'on')
    start(3)
    const first = readSavedMatch()!.state.round.dealer
    const name = first === 0 ? 'You' : `Bot ${first}`
    expect(screen.getByText(`Deals: ${name}`)).toBeTruthy()
    cleanup()
    localStorage.setItem('reduce-motion', 'off')
    render(<App />)
    expect(document.querySelectorAll('[data-spotlight]')).toHaveLength(0)
    expect(screen.queryByText(`Deals: ${name}`)).toBeNull()
  })

  it('keeps the action areas in place between turns', () => {
    start(3, 'hard')
    const spots = () =>
      ['prompt'].map((id) => screen.getByTestId(id).className).concat(
        screen.getAllByRole('button', { name: /Go out|Cancel/ }).map((item) => item.className.replace(/pile-ready|bg-\S+|text-\S+|opacity-\S+/g, '')),
      )
    const before = spots()
    advance(STARTER_MS + DEAL_HOLD + 3000)
    expect(spots()).toEqual(before)
    expect(screen.getByRole('button', { name: /^Take a card from the deck$/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /^Go out$/ })).toBeTruthy()
  })

  it('flies the cover, reveals every set in turn and then opens the summary', () => {
    const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit, copy: 0 })
    const hand = [
      c(1, 'hearts'), c(2, 'hearts'), c(3, 'hearts'),
      c(5, 'clubs'), c(5, 'diamonds'), c(5, 'spades'),
      c(9, 'spades'), c(10, 'spades'), c(11, 'spades'),
      c(6, 'hearts'), c(6, 'clubs'), c(6, 'diamonds'), c(8, 'diamonds'),
    ]
    const base = createMatch({ players: 2, target: 25 }, 4)
    const state = {
      ...base,
      round: { ...base.round, trump: c(3, 'spades'), hands: [hand, base.round.hands[1]], turn: 0, phase: 'discard' as const, draws: 1, moves: [{ type: 'draw' as const, seat: 0, source: 'deck' as const, card: null }] },
    }
    localStorage.setItem('saved-match', JSON.stringify({ state, seed: 4, level: 'medium' }))
    render(<App />)
    fireEvent.click(button('Go out')!)
    fireEvent.click(cardButton(c(8, 'diamonds')))
    expect(screen.getByTestId('cover')).toBeTruthy()
    expect(screen.queryByTestId('reveal')).toBeNull()
    const result = readSavedMatch()!.state.results[0]
    const steps = revealSteps(result)
    expect(steps.slice(0, 4).every((step) => step.seat === 0)).toBe(true)
    advance(COVER_FLIGHT_MS)
    for (let shown = 1; shown <= steps.length; shown++) {
      expect(screen.getByTestId('reveal').querySelectorAll('[data-step]')).toHaveLength(shown)
      expect(screen.queryByText('Round 1 finished')).toBeNull()
      advance(REVEAL_STEP_MS)
    }
    expect(screen.getByText('Round 1 finished')).toBeTruthy()
    expect(screen.getByText('You went out, covered with 8♦')).toBeTruthy()
  })

  it('takes from the deck and discards a card with two taps', () => {
    start(2, 'medium')
    waitForMyDraw()
    const deck = button(/^Take a card from the deck$/)!
    fireEvent.click(deck)
    expect(readSavedMatch()!.state.round.phase).toBe('draw')
    expect(deck.getAttribute('aria-pressed')).toBe('true')
    const lifted = document.querySelectorAll('[data-lifted]')
    expect(lifted).toHaveLength(1)
    const slide = screen.getByTestId('slide')
    expect(lifted[0].parentElement).toBe(slide)
    expect(slide.lastElementChild).toBe(lifted[0])
    expect(deck.className).not.toContain('translate')
    fireEvent.click(deck)
    const drawn = readSavedMatch()!.state
    expect(drawn.round.phase).toBe('discard')
    expect(drawn.round.hands[0]).toHaveLength(13)
    const plain = drawn.round.hands[0].filter((item) => !isMirror(item, drawn.round.trump))
    const card = plain[3]
    const other = plain[5]
    fireEvent.click(cardButton(card))
    expect(cardButton(card).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(cardButton(other))
    expect(cardButton(card).getAttribute('aria-pressed')).toBe('false')
    expect(cardButton(other).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('main'))
    expect(cardButton(other).getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(cardButton(card))
    advance(1000)
    expect(readSavedMatch()!.state.round.hands[0]).toHaveLength(13)
    fireEvent.click(cardButton(card))
    const after = readSavedMatch()!.state
    expect(after.round.hands[0]).toHaveLength(12)
    expect(after.round.discards.at(-1)).toEqual(card)
  })

  it('takes the top discard with two taps', () => {
    start(2, 'medium')
    for (let round = 0; round < 3; round++) {
      waitForMyDraw()
      if (readSavedMatch()!.state.round.discards.length > 0) break
      perform({ type: 'draw', seat: 0, source: 'deck' })
      perform({ type: 'discard', seat: 0, card: readSavedMatch()!.state.round.hands[0][0] })
    }
    const top = readSavedMatch()!.state.round.discards.at(-1)!
    const pile = button(/^Take the discard/)!
    fireEvent.click(pile)
    expect(readSavedMatch()!.state.round.phase).toBe('draw')
    expect(pile.querySelectorAll('[data-lifted]')).toHaveLength(1)
    expect(document.querySelectorAll('[data-lifted]')).toHaveLength(1)
    fireEvent.click(pile)
    const state = readSavedMatch()!.state
    expect(state.round.phase).toBe('discard')
    expect(state.round.hands[0].some((card) => cardId(card) === cardId(top))).toBe(true)
  })

  it('takes the mirror resting on the trump with two taps', () => {
    const base = createMatch({ players: 2, target: 25 }, 4)
    const mirror: Card = { ...base.round.trump, copy: base.round.trump.copy === 0 ? 1 : 0 }
    const hands = base.round.hands.map((hand) => hand.filter((item) => cardId(item) !== cardId(mirror)))
    const state = {
      ...base,
      round: {
        ...base.round,
        hands,
        turn: 0,
        phase: 'draw' as const,
        draws: 2,
        mirrorOnTrump: mirror,
        mirrorOffer: 0,
        moves: [{ type: 'discard' as const, seat: 1, card: mirror }],
      },
    }
    localStorage.setItem('saved-match', JSON.stringify({ state, seed: 4, level: 'medium' }))
    render(<App />)
    expect(screen.getByTestId('mirror-on-trump')).toBeTruthy()
    const spot = button(/^Take the mirror/)!
    fireEvent.click(spot)
    expect(readSavedMatch()!.state.round.mirrorOnTrump).not.toBeNull()
    const lifted = document.querySelectorAll('[data-lifted]')
    expect(lifted).toHaveLength(1)
    expect(screen.getByTestId('mirror-on-trump').contains(lifted[0])).toBe(true)
    fireEvent.click(spot)
    const after = readSavedMatch()!.state
    expect(after.round.mirrorOnTrump).toBeNull()
    expect(after.round.hands[0].some((item) => cardId(item) === cardId(mirror))).toBe(true)
  })

  it('asks before leaving a match', () => {
    start(4)
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep playing' }))
    expect(screen.getByRole('region', { name: 'Your hand' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes, exit' }))
    expect(screen.getByText('How it plays')).toBeTruthy()
  })
})
