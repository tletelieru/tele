import { parseArgs } from 'node:util'
import { createRng, easyBot, hardBot, mediumBot, randomBot } from '@tele/bots'
import type { Bot } from '@tele/bots'
import {
  DEFAULT_TARGET,
  applyAction,
  createMatch,
  legalActions,
  matchTotals,
  startNextRound,
  viewFor,
} from '@tele/engine'
import type { MatchState, PlayerCount } from '@tele/engine'

const { values } = parseArgs({
  options: {
    matches: { type: 'string', default: '200' },
    players: { type: 'string', default: '4' },
    seed: { type: 'string', default: '1' },
    hero: { type: 'string', default: 'medium' },
    field: { type: 'string', default: 'easy' },
    target: { type: 'string', default: String(DEFAULT_TARGET) },
  },
})

const CATALOG: Record<string, Bot> = {
  random: randomBot,
  easy: easyBot,
  medium: mediumBot,
  hard: hardBot,
}

const MAX_ACTIONS = 20000

const matches = Number(values.matches)
const players = Number(values.players) as PlayerCount
const target = Number(values.target)
const firstSeed = Number(values.seed)
const hero = CATALOG[values.hero]
const field = CATALOG[values.field]

const validPlayers = Number.isInteger(players) && players >= 2 && players <= 6

if (!Number.isInteger(matches) || matches < 1 || !validPlayers || !hero || !field || !(target > 0)) {
  console.error(
    'Usage: pnpm sim --matches <n> --players <2-6> --hero <bot> --field <bot> --target <points>',
  )
  process.exit(1)
}

function playMatch(seed: number, heroSeat: number): MatchState | null {
  const rng = createRng(seed)
  let state = createMatch({ players, target }, seed)
  for (let step = 0; step < MAX_ACTIONS; step++) {
    if (state.status === 'matchOver') return state
    if (state.status === 'roundOver') {
      state = startNextRound(state)
      continue
    }
    const seat = state.round.turn
    const bot = seat === heroSeat ? hero : field
    state = applyAction(state, bot.choose(viewFor(state, seat), legalActions(state, seat), rng))
  }
  return null
}

let wins = 0
let points = 0
let fieldPoints = 0
let rounds = 0
let unfinished = 0
const started = performance.now()

for (let index = 0; index < matches; index++) {
  const heroSeat = index % players
  const state = playMatch(firstSeed + index, heroSeat)
  if (!state) {
    unfinished += 1
    continue
  }
  if (state.winner === heroSeat) wins += 1
  rounds += state.results.length
  matchTotals(state).forEach((total, seat) => {
    if (seat === heroSeat) points += total
    else fieldPoints += total
  })
}

const played = matches - unfinished
const rate = wins / played
const margin = 1.96 * Math.sqrt((rate * (1 - rate)) / played)
const elapsed = performance.now() - started

console.log(`${values.hero} vs ${values.field}, ${players} players, ${matches} matches to ${target}`)
console.log(`${(elapsed / matches).toFixed(1)} ms/match, ${(rounds / played).toFixed(1)} rounds/match`)
console.log(
  `wins: ${(rate * 100).toFixed(1)}% ±${(margin * 100).toFixed(1)} (even: ${(100 / players).toFixed(1)}%)`,
)
console.log(`avg points: ${(points / played).toFixed(1)}`)
console.log(`field avg points: ${(fieldPoints / played / (players - 1)).toFixed(1)}`)
if (unfinished > 0) console.log(`unfinished: ${unfinished}`)
