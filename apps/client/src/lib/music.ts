const LOOKAHEAD_SECONDS = 0.3
const TICK_MS = 100
const MASTER_VOLUME = 0.5
const STEPS_PER_CHORD = 16

const REST = 0

export type TrackId = 'intro' | 'table' | 'tense'

export type SoundId = 'card' | 'out' | 'tick' | 'chime'

export interface Track {
  bpm: number
  melody: number[]
  chords: number[][]
}

export const TRACKS: Record<TrackId, Track> = {
  intro: {
    bpm: 100,
    melody: [
      76, REST, 72, 76, REST, 77, 76, REST, 72, REST, 69, REST, 72, REST, REST, REST,
      74, REST, 71, 74, REST, 76, 74, REST, 71, REST, 67, REST, 71, REST, REST, REST,
      72, REST, 69, 72, REST, 74, 72, REST, 69, REST, 65, REST, 69, REST, 72, REST,
      71, REST, REST, 67, REST, 64, 67, REST, 71, REST, REST, REST, 72, REST, REST, REST,
    ],
    chords: [
      [41, 57, 60, 64],
      [40, 55, 59, 62],
      [38, 53, 57, 60],
      [36, 52, 55, 59],
    ],
  },
  table: {
    bpm: 104,
    melody: [
      64, REST, 67, REST, 71, REST, 72, 71, REST, 67, REST, 64, REST, REST, 67, REST,
      69, REST, 72, REST, 76, REST, 74, 72, REST, 69, REST, 67, REST, REST, 64, REST,
      65, REST, 69, REST, 72, REST, 74, 72, REST, 69, REST, 65, REST, REST, 62, REST,
      67, REST, 71, REST, 74, REST, 77, 76, REST, 74, REST, 71, REST, REST, REST, REST,
    ],
    chords: [
      [36, 52, 55, 59],
      [45, 55, 60, 64],
      [38, 53, 57, 60],
      [43, 53, 59, 62],
    ],
  },
  tense: {
    bpm: 108,
    melody: [
      70, 74, REST, 75, REST, 74, 70, REST, 67, REST, 70, REST, 74, REST, REST, REST,
      69, 72, REST, 74, REST, 72, 69, REST, 65, REST, 69, REST, 72, REST, REST, REST,
      68, 72, REST, 73, REST, 72, 68, REST, 65, REST, 68, REST, 72, REST, REST, REST,
      67, 71, REST, 72, REST, 71, 67, REST, 64, REST, 67, REST, 71, REST, 76, REST,
    ],
    chords: [
      [39, 55, 58, 62],
      [38, 53, 57, 60],
      [37, 53, 56, 60],
      [36, 52, 55, 59],
    ],
  },
}

function stepSeconds(track: Track): number {
  return 60 / track.bpm / 2
}

function frequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

function playTone(
  context: AudioContext,
  output: AudioNode,
  midi: number,
  time: number,
  length: number,
  type: OscillatorType,
  volume: number,
): void {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency(midi)
  gain.gain.setValueAtTime(volume, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + length)
  oscillator.connect(gain).connect(output)
  oscillator.start(time)
  oscillator.stop(time + length)
}

const WIN_NOTES = [72, 76, 79, 84, 79, 84, 88]
const LOSE_NOTES = [69, 67, 64, 62, 60, 57]
const WIN_STEP_SECONDS = 0.14
const LOSE_STEP_SECONDS = 0.34

function playSlide(context: AudioContext, output: AudioNode, time: number): void {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'triangle'
  oscillator.frequency.setValueAtTime(420, time)
  oscillator.frequency.exponentialRampToValueAtTime(140, time + 0.07)
  gain.gain.setValueAtTime(0.5, time)
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09)
  oscillator.connect(gain).connect(output)
  oscillator.start(time)
  oscillator.stop(time + 0.1)
}

const OUT_NOTES = [67, 72, 76, 79]
const CHIME_NOTES = [79, 84]
const TICK_NOTE = 84
const ARPEGGIO_SECONDS = 0.09

const SOUNDS: Record<SoundId, (context: AudioContext, output: AudioNode, time: number) => void> = {
  card: playSlide,
  tick: (context, output, time) => playTone(context, output, TICK_NOTE, time, 0.05, 'square', 0.05),
  chime: (context, output, time) =>
    CHIME_NOTES.forEach((note, index) =>
      playTone(context, output, note, time + index * ARPEGGIO_SECONDS * 1.5, 0.4, 'triangle', 0.12),
    ),
  out: (context, output, time) =>
    OUT_NOTES.forEach((note, index) =>
      playTone(context, output, note, time + index * ARPEGGIO_SECONDS, 0.3, 'square', 0.06),
    ),
}

function scheduleStep(
  context: AudioContext,
  output: AudioNode,
  track: Track,
  step: number,
  time: number,
): void {
  const length = stepSeconds(track)
  const note = track.melody[step % track.melody.length]
  if (note !== REST) playTone(context, output, note, time, length * 1.8, 'square', 0.035)
  const position = step % (STEPS_PER_CHORD * track.chords.length)
  const chord = track.chords[Math.floor(position / STEPS_PER_CHORD)]
  const inChord = position % STEPS_PER_CHORD
  if (inChord % 8 === 0) playTone(context, output, chord[0], time, length * 3.6, 'triangle', 0.14)
  if (inChord % 2 === 1) {
    playTone(context, output, chord[1 + (inChord >> 1) % 3], time, length, 'triangle', 0.05)
  }
}

export interface Music {
  play: () => void
  pause: () => void
  effect: (id: SoundId) => void
  jingle: (won: boolean) => void
  setTrack: (id: TrackId) => void
}

export function createMusic(initial: TrackId = 'intro'): Music | null {
  if (typeof AudioContext === 'undefined') return null
  let context: AudioContext | null = null
  let output: GainNode | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let step = 0
  let track = TRACKS[initial]
  let nextTime = 0

  const tick = () => {
    if (!context || !output) return
    while (nextTime < context.currentTime + LOOKAHEAD_SECONDS) {
      scheduleStep(context, output, track, step, nextTime)
      step += 1
      nextTime += stepSeconds(track)
    }
  }

  return {
    play() {
      if (!context) {
        context = new AudioContext()
        output = context.createGain()
        output.gain.value = MASTER_VOLUME
        output.connect(context.destination)
        nextTime = context.currentTime + 0.05
      }
      void context.resume()
      timer ??= setInterval(tick, TICK_MS)
    },
    pause() {
      if (timer !== null) clearInterval(timer)
      timer = null
      void context?.suspend()
    },
    setTrack(id) {
      if (track === TRACKS[id]) return
      track = TRACKS[id]
      step = 0
    },
    effect(id) {
      if (!context || !output) return
      SOUNDS[id](context, output, context.currentTime)
    },
    jingle(won) {
      if (!context || !output) return
      const notes = won ? WIN_NOTES : LOSE_NOTES
      const length = won ? WIN_STEP_SECONDS : LOSE_STEP_SECONDS
      const start = context.currentTime + 0.05
      notes.forEach((note, index) => {
        const time = start + index * length
        playTone(context!, output!, note, time, length * 1.6, won ? 'square' : 'triangle', 0.07)
      })
      nextTime = start + notes.length * length + 1
    },
  }
}
