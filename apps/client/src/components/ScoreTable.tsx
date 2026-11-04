import { useMessages } from '../i18n/messages'
import type { RoundRow } from '../lib/history'
import { Points } from './Points'

interface Props {
  names: string[]
  rounds: RoundRow[]
  target: number
}

export function ScoreTable({ names, rounds, target }: Props) {
  const t = useMessages()
  const totals = names.map((_, seat) => rounds.reduce((total, round) => total + round.points[seat], 0))
  const best = Math.max(...totals)

  return (
    <div className="flex flex-col gap-1">
      <p className="text-center text-xs text-muted">
        {t.target} {t.targetPoints(target)}
      </p>
      <table className="w-full table-fixed border-separate [border-spacing:0.25rem]">
        <thead>
          <tr>
            <th className="w-8" aria-label={t.roundLabel(0)} />
            {names.map((name, seat) => {
              const leading = rounds.length > 0 && totals[seat] === best
              return (
                <th
                  key={name}
                  scope="col"
                  className={`pixel-box bg-raised px-0.5 py-1.5 font-normal ${
                    leading ? 'shadow-[inset_0_0_0_2px_var(--gold)]' : ''
                  }`}
                >
                  <span className="block truncate text-xs text-muted">{name}</span>
                  <span className="block font-pixel text-2xl leading-none tabular-nums">
                    {totals[seat]}
                  </span>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rounds.map((round, index) => (
            <tr key={index}>
              <th scope="row" aria-label={t.roundLabel(index + 1)} className="p-0 font-pixel text-lg font-normal text-gold">
                {index + 1}
              </th>
              {names.map((name, seat) => (
                <td key={name} className={`p-0 ${index === rounds.length - 1 ? 'score-pop' : ''}`}>
                  <div className={round.out === seat ? 'score-live' : ''}>
                    <Points value={round.points[seat]} block />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
