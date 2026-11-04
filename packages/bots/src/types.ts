import type { Action, PlayerView } from '@tele/engine'

export type Rng = () => number

export type Level = 'easy' | 'medium' | 'hard'

export interface Bot {
  choose(view: PlayerView, legal: Action[], rng: Rng): Action
}
