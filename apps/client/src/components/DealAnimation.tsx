import type { CSSProperties } from 'react'
import type { PlayerCount } from '@tele/engine'
import { HUMAN } from '../useMatch'

const FLIGHTS_PER_SEAT = 4
const SPREAD = 300
const TOP = -280
const BOTTOM = 240

function seatVector(seat: number, players: PlayerCount): { x: number; y: number } {
  if (seat === HUMAN) return { x: 0, y: BOTTOM }
  const opponents = players - 1
  const column = players - 1 - seat
  return { x: ((column + 0.5) / opponents - 0.5) * SPREAD, y: TOP }
}

export function DealAnimation({ players, first }: { players: PlayerCount; first: number }) {
  const seats = Array.from({ length: players }, (_, offset) => (first + offset) % players)

  return (
    <div aria-hidden="true" className="pointer-events-none fixed top-1/2 left-1/2 z-10">
      {Array.from({ length: FLIGHTS_PER_SEAT }, (_, round) =>
        seats.map((seat, index) => {
          const vector = seatVector(seat, players)
          const style = {
            '--to-x': `${vector.x}px`,
            '--to-y': `${vector.y}px`,
            '--delay': `${(round * players + index) * 50}ms`,
          } as CSSProperties
          return <span key={`${round}-${seat}`} style={style} className="deal-flight card-back" />
        }),
      )}
    </div>
  )
}
