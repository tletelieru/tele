import { describe, expect, it } from 'vitest'
import { createMatch } from '@tele/engine'
import { TRACKS } from './music'
import { ACTION_SOUNDS, trackForMatch } from './sound'

describe('music', () => {
  it('keeps the same shape in every track', () => {
    for (const track of Object.values(TRACKS)) {
      expect(track.melody).toHaveLength(64)
      expect(track.chords).toHaveLength(4)
    }
    expect(new Set(Object.values(TRACKS).map((track) => track.melody.join())).size).toBe(3)
  })

  it('picks the track from the match setup', () => {
    const state = createMatch({ players: 3, target: 25 }, 1)
    expect(trackForMatch(null)).toBe('intro')
    expect(trackForMatch(state)).toBe('table')
    const close = { ...state, results: [{ ...{ out: 0, cover: null, trump: state.round.trump, seats: [] }, points: [21, 0, 0] }] }
    expect(trackForMatch(close)).toBe('tense')
  })

  it('gives every action a sound', () => {
    expect(ACTION_SOUNDS).toEqual({ draw: 'card', discard: 'card', goOut: 'out' })
  })
})
