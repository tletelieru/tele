import { createThinkingBot } from './thinking'

export const hardBot = createThinkingBot({ outs: 1, candidates: 5, defense: 6, rivals: 0, noise: 0.5 })
