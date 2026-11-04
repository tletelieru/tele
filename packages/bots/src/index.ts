import { easyBot } from './easy'
import { hardBot } from './hard'
import { mediumBot } from './medium'
import type { Bot, Level } from './types'

export { easyBot, randomBot } from './easy'
export { hardBot } from './hard'
export { mediumBot } from './medium'
export { createRng } from './rng'
export { createThinkingBot } from './thinking'
export type { Style } from './thinking'
export type { Bot, Level, Rng } from './types'

export const BOTS: Record<Level, Bot> = {
  easy: easyBot,
  medium: mediumBot,
  hard: hardBot,
}
