import { formatPoints } from '../lib/cards'

interface Props {
  value: number
  block?: boolean
}

function tone(value: number): string {
  if (value > 0) return 'bg-emerald-500/20'
  if (value < 0) return 'bg-rose-500/20'
  return 'text-muted'
}

export function Points({ value, block = false }: Props) {
  const shape = block
    ? 'flex h-9 items-center justify-center font-pixel text-xl leading-none'
    : 'inline-block px-1 py-0.5'

  return (
    <span
      className={`pixel-box tabular-nums ${shape} ${tone(value)} ${
        block && value === 0 ? 'bg-raised' : ''
      }`}
    >
      {formatPoints(value)}
    </span>
  )
}
