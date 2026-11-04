import type { Level } from '@tele/bots'
import { matchTotals } from '@tele/engine'
import type { MatchState, PlayerCount, Seat } from '@tele/engine'

export interface RoundRow {
  points: number[]
  out: Seat | null
}

export interface MatchRecord {
  id: number
  finishedAt: number
  players: PlayerCount
  level: Level
  target: number
  rounds: RoundRow[]
  totals: number[]
  winner: Seat | null
  abandoned?: boolean
}

export const historyKey = 'match-history'

const MAX_RECORDS = 50

export function readHistory(): MatchRecord[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(historyKey) ?? '[]')
    return Array.isArray(saved) ? (saved as MatchRecord[]) : []
  } catch {
    return []
  }
}

export function saveRecord(record: MatchRecord): void {
  const history = readHistory()
  if (history.some((item) => item.id === record.id)) return
  localStorage.setItem(historyKey, JSON.stringify([record, ...history].slice(0, MAX_RECORDS)))
}

export function roundRows(state: Pick<MatchState, 'results'>): RoundRow[] {
  return state.results.map(({ points, out }) => ({ points, out }))
}

export function recordFor(state: MatchState, seed: number, level: Level, abandoned = false): MatchRecord {
  return {
    id: seed,
    finishedAt: Date.now(),
    players: state.players,
    level,
    target: state.target,
    rounds: roundRows(state),
    totals: matchTotals(state),
    winner: abandoned ? null : state.winner,
    ...(abandoned ? { abandoned } : {}),
  }
}
