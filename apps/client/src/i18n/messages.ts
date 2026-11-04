import { createContext, useContext } from 'react'
import type { Level } from '@tele/bots'
import type { CardMark, SortMode } from '../lib/cards'
import type { TextSize } from '../lib/textSize'
import { defaultLocale } from './locales'
import type { Locale } from './locales'

export type Outcome = 'won' | 'lost' | 'abandoned'

export interface Messages {
  appName: string
  tagline: string
  howTitle: string
  howSteps: string[]
  history: string
  historyEmpty: string
  historySummary: (played: number, won: number) => string
  playerCount: (n: number) => string
  outcomes: Record<Outcome, string>
  rules: string
  difficulty: string
  levels: Record<Level, string>
  levelHints: Record<Level, string>
  players: string
  target: string
  targetPoints: (n: number) => string
  play: string
  you: string
  bot: (n: number) => string
  yourHand: string
  sortBy: string
  sortModes: Record<SortMode, string>
  marks: Record<CardMark, string>
  wildsLabel: string
  drawPrompt: string
  firstPrompt: string
  discardPrompt: string
  outPrompt: string
  coverPrompt: string
  coverPromptFree: string
  notSets: string
  waiting: (name: string) => string
  goOut: string
  cancel: string
  deck: string
  discards: string
  emptyPile: string
  takeDeck: string
  takeDiscard: (card: string) => string
  takeTrump: (card: string) => string
  heldTrump: (name: string) => string
  cardsLeft: (n: number) => string
  points: (n: number) => string
  drewDeck: (name: string) => string
  drewDiscard: (name: string, card: string) => string
  drewTrump: (name: string, card: string) => string
  discarded: (name: string, card: string) => string
  wentOut: (name: string) => string
  reshuffled: string
  roundStart: (name: string) => string
  settings: string
  musicOff: string
  musicOnLabel: string
  deals: (name: string) => string
  dealer: string
  takeMirror: (card: string) => string
  drewMirror: (name: string, card: string) => string
  leftMirror: (name: string, card: string) => string
  textSize: string
  textSizes: Record<TextSize, string>
  plainFont: string
  plainFontHint: string
  reduceMotion: string
  reduceMotionHint: string
  exit: string
  exitTitle: string
  exitBody: string
  exitConfirm: string
  keepPlaying: string
  close: string
  scoreTitle: string
  roundLabel: (n: number) => string
  roundFinished: (n: number) => string
  outBy: (name: string) => string
  youOut: string
  youWon: (points: number) => string
  coveredWith: (card: string) => string
  breakdown: {
    out: string
    sets: string
    mirror: string
    wilds: string
    none: string
  }
  nextRound: string
  matchFinished: string
  backHome: string
  winner: (name: string, points: number) => string
  toLight: string
  toDark: string
  language: string
  install: string
  developedBy: string
  otherGames: string
  showOtherGames: string
  hideOtherGames: string
  showOtherGamesHint: string
}

export const messages: Record<Locale, Messages> = {
  en: {
    appName: 'Tele',
    tagline: 'Go out with all 12 cards in trios and runs, against bots.',
    howTitle: 'How it plays',
    howSteps: [
      'Take the last discard or a card from the deck.',
      'With 12 cards in sets, go out and cover with the 13th.',
      'Mirror, wild cards and sets of 5+ score for everyone.',
    ],
    history: 'History',
    historyEmpty: 'Finished matches will appear here.',
    historySummary: (played, won) => `${played} played · ${won} won`,
    playerCount: (n) => `${n} players`,
    outcomes: { won: 'You won', lost: 'You lost', abandoned: 'Abandoned' },
    rules: 'Rules',
    difficulty: 'Difficulty',
    levels: { easy: 'Easy', medium: 'Medium', hard: 'Hard' },
    levelHints: {
      easy: 'bots that slip up',
      medium: 'bots that guard their points',
      hard: 'bots that count every card',
    },
    players: 'Players',
    target: 'Play to',
    targetPoints: (n) => `${n} points`,
    play: 'Play',
    you: 'You',
    bot: (n) => `Bot ${n}`,
    yourHand: 'Your hand',
    sortBy: 'Sort',
    sortModes: { rank: 'Number', suit: 'Suit', sets: 'Sets' },
    marks: { wild: 'Wild card', mirror: 'Mirror', trump: 'Trump' },
    wildsLabel: 'Wild',
    drawPrompt: 'Your turn. Take the discard or a card from the deck.',
    firstPrompt: 'Your turn. Take a card from the deck or the trump.',
    discardPrompt: 'Tap a card twice to discard it. Drag to sort.',
    outPrompt: 'You can go out! Or tap a card twice to discard it.',
    coverPrompt: 'Pick the card you cover with.',
    coverPromptFree: 'Arrange your sets and tap the card you cover with.',
    notSets: "Those cards don't form sets.",
    waiting: (name) => `${name} is playing…`,
    goOut: 'Go out',
    cancel: 'Cancel',
    deck: 'Deck',
    discards: 'Discards',
    emptyPile: 'Empty',
    takeDeck: 'Take a card from the deck',
    takeDiscard: (card) => `Take the discard ${card}`,
    takeTrump: (card) => `Take the trump ${card}`,
    heldTrump: (name) => `${name} holds the trump`,
    cardsLeft: (n) => `${n} ${n === 1 ? 'card' : 'cards'}`,
    points: (n) => `${n} pts`,
    drewDeck: (name) => `${name} took from the deck`,
    drewDiscard: (name, card) => `${name} took the ${card}`,
    drewTrump: (name, card) => `${name} took the trump ${card}`,
    discarded: (name, card) => `${name} discarded ${card}`,
    wentOut: (name) => `${name} went out!`,
    reshuffled: 'The discards were shuffled into a new deck',
    roundStart: (name) => `${name} starts`,
    settings: 'Settings',
    musicOff: 'Turn music off',
    musicOnLabel: 'Turn music on',
    deals: (name) => `Deals: ${name}`,
    dealer: 'Dealer',
    takeMirror: (card) => `Take the mirror ${card}`,
    drewMirror: (name, card) => `${name} took the mirror ${card}`,
    leftMirror: (name, card) => `${name} left the mirror ${card} on the trump`,
    textSize: 'Text size',
    textSizes: { normal: 'Normal', large: 'Large', xlarge: 'Extra large' },
    plainFont: 'Plain font',
    plainFontHint: 'Uses a regular font instead of the pixel one.',
    reduceMotion: 'Turn off animations',
    reduceMotionHint: 'Windows and cards appear without moving.',
    exit: 'Exit',
    exitTitle: 'Leave this match?',
    exitBody: 'You will lose the match in progress.',
    exitConfirm: 'Yes, exit',
    keepPlaying: 'Keep playing',
    close: 'Close',
    scoreTitle: 'Score',
    roundLabel: (n) => `Round ${n}`,
    roundFinished: (n) => `Round ${n} finished`,
    outBy: (name) => `${name} went out`,
    youOut: 'You went out',
    youWon: (points) => `You won with ${points} points!`,
    coveredWith: (card) => `covered with ${card}`,
    breakdown: {
      out: 'Out',
      sets: 'Sets 5+',
      mirror: 'Mirror',
      wilds: 'Wild',
      none: 'No points',
    },
    nextRound: 'Next round',
    matchFinished: 'Match finished',
    backHome: 'Back to start',
    winner: (name, points) => `${name} won with ${points} points`,
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
    language: 'Language',
    install: 'Install app',
    developedBy: 'Developed by',
    otherGames: 'Other games',
    showOtherGames: 'Show other games',
    hideOtherGames: 'Hide other games',
    showOtherGamesHint: 'Links to the other card games: a side column on wide screens, a header button on narrow ones.',
  },
  es: {
    appName: 'Tele',
    tagline: 'Bájate con las 12 cartas en tríos y escaleras, contra bots.',
    howTitle: 'Cómo se juega',
    howSteps: [
      'Saca la última botada o una carta del mazo.',
      'Con 12 cartas en juegos, te bajas y tapas con la 13ª.',
      'Espejo, comodines y juegos de 5 o más suman para todos.',
    ],
    history: 'Historial',
    historyEmpty: 'Aquí aparecerán las partidas terminadas.',
    historySummary: (played, won) => `${played} jugadas · ${won} ganadas`,
    playerCount: (n) => `${n} jugadores`,
    outcomes: { won: 'Ganaste', lost: 'Perdiste', abandoned: 'Abandonada' },
    rules: 'Reglas',
    difficulty: 'Dificultad',
    levels: { easy: 'Fácil', medium: 'Medio', hard: 'Difícil' },
    levelHints: {
      easy: 'bots que se equivocan',
      medium: 'bots que cuidan sus puntos',
      hard: 'bots que cuentan cada carta',
    },
    players: 'Jugadores',
    target: 'Jugar a',
    targetPoints: (n) => `${n} puntos`,
    play: 'Jugar',
    you: 'Tú',
    bot: (n) => `Bot ${n}`,
    yourHand: 'Tu mano',
    sortBy: 'Ordenar',
    sortModes: { rank: 'Número', suit: 'Pinta', sets: 'Juegos' },
    marks: { wild: 'Comodín', mirror: 'Espejo', trump: 'Triunfo' },
    wildsLabel: 'Comodín',
    drawPrompt: 'Tu turno. Saca la botada o una carta del mazo.',
    firstPrompt: 'Tu turno. Saca una carta del mazo o el triunfo.',
    discardPrompt: 'Toca dos veces una carta para botarla. Arrastra para ordenar.',
    outPrompt: '¡Puedes bajarte! O toca dos veces una carta para botarla.',
    coverPrompt: 'Elige la carta con que tapas.',
    coverPromptFree: 'Arma tus juegos y toca la carta con que tapas.',
    notSets: 'Esas cartas no forman juegos.',
    waiting: (name) => `Juega ${name}…`,
    goOut: 'Bajarse',
    cancel: 'Cancelar',
    deck: 'Mazo',
    discards: 'Botadas',
    emptyPile: 'Vacío',
    takeDeck: 'Sacar carta del mazo',
    takeDiscard: (card) => `Sacar la botada ${card}`,
    takeTrump: (card) => `Sacar el triunfo ${card}`,
    heldTrump: (name) => `${name} tiene el triunfo`,
    cardsLeft: (n) => `${n} ${n === 1 ? 'carta' : 'cartas'}`,
    points: (n) => `${n} pts`,
    drewDeck: (name) => `${name} sacó del mazo`,
    drewDiscard: (name, card) => `${name} sacó el ${card}`,
    drewTrump: (name, card) => `${name} sacó el triunfo ${card}`,
    discarded: (name, card) => `${name} botó el ${card}`,
    wentOut: (name) => `¡${name} se bajó!`,
    reshuffled: 'Se revolvieron las botadas para armar otro mazo',
    roundStart: (name) => `Parte ${name}`,
    settings: 'Ajustes',
    musicOff: 'Apagar música',
    musicOnLabel: 'Encender música',
    deals: (name) => `Da: ${name}`,
    dealer: 'Da',
    takeMirror: (card) => `Sacar el espejo ${card}`,
    drewMirror: (name, card) => `${name} sacó el espejo ${card}`,
    leftMirror: (name, card) => `${name} dejó el espejo ${card} sobre el triunfo`,
    textSize: 'Tamaño del texto',
    textSizes: { normal: 'Normal', large: 'Grande', xlarge: 'Muy grande' },
    plainFont: 'Letra normal',
    plainFontHint: 'Usa una letra común en vez de la pixelada.',
    reduceMotion: 'Desactivar animaciones',
    reduceMotionHint: 'Las ventanas y cartas aparecen sin moverse.',
    exit: 'Salir',
    exitTitle: '¿Seguro que quieres salir?',
    exitBody: 'Se perderá la partida en curso.',
    exitConfirm: 'Sí, salir',
    keepPlaying: 'Seguir jugando',
    close: 'Cerrar',
    scoreTitle: 'Puntaje',
    roundLabel: (n) => `Ronda ${n}`,
    roundFinished: (n) => `Fin de la ronda ${n}`,
    outBy: (name) => `${name} se bajó`,
    youOut: 'Te bajaste',
    youWon: (points) => `¡Ganaste con ${points} puntos!`,
    coveredWith: (card) => `tapó con ${card}`,
    breakdown: {
      out: 'Bajarse',
      sets: 'Juegos de 5+',
      mirror: 'Espejo',
      wilds: 'Comodines',
      none: 'Sin puntos',
    },
    nextRound: 'Siguiente ronda',
    matchFinished: 'Fin de la partida',
    backHome: 'Volver al inicio',
    winner: (name, points) => `Ganador: ${name} con ${points} puntos`,
    toLight: 'Cambiar a modo claro',
    toDark: 'Cambiar a modo oscuro',
    language: 'Idioma',
    install: 'Instalar app',
    developedBy: 'Desarrollado por',
    otherGames: 'Otros juegos',
    showOtherGames: 'Mostrar otros juegos',
    hideOtherGames: 'Ocultar otros juegos',
    showOtherGamesHint: 'Enlaces a los otros juegos de naipes: una columna lateral en pantallas anchas y un botón en la cabecera en las angostas.',
  },
}

export const LocaleContext = createContext<Locale>(defaultLocale)

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useMessages(): Messages {
  return messages[useLocale()]
}
