import { createContext, useContext } from 'react'
import type { TextSize } from '../lib/textSize'
import { defaultLocale } from './locales'
import type { Locale } from './locales'

export interface Messages {
  appName: string
  tagline: string
  players: string
  playerRange: string
  deck: string
  deckName: string
  soon: string
  soonHint: string
  rules: string
  settings: string
  textSize: string
  textSizes: Record<TextSize, string>
  plainFont: string
  plainFontHint: string
  reduceMotion: string
  reduceMotionHint: string
  close: string
  toLight: string
  toDark: string
  language: string
  install: string
  developedBy: string
}

export const messages: Record<Locale, Messages> = {
  en: {
    appName: "Tele",
    tagline: "Go out with all 12 cards in trios and runs, against bots.",
    players: 'Players',
    playerRange: '2–6',
    deck: 'Deck',
    deckName: "Two French decks, 104 cards",
    soon: 'Coming soon',
    soonHint: 'The table is still being built. Meanwhile, read the rules.',
    rules: 'Rules',
    settings: 'Settings',
    textSize: 'Text size',
    textSizes: { normal: 'Normal', large: 'Large', xlarge: 'Extra large' },
    plainFont: 'Plain font',
    plainFontHint: 'Uses a regular font instead of the pixel one.',
    reduceMotion: 'Turn off animations',
    reduceMotionHint: 'Windows and cards appear without moving.',
    close: 'Close',
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
    language: 'Language',
    install: 'Install app',
    developedBy: 'Developed by',
  },
  es: {
    appName: "Tele",
    tagline: "Bájate con las 12 cartas en tríos y escaleras, contra bots.",
    players: 'Jugadores',
    playerRange: '2–6',
    deck: 'Naipe',
    deckName: "Dos naipes ingleses, 104 cartas",
    soon: 'Próximamente',
    soonHint: 'La mesa todavía está en construcción. Mientras, revisa las reglas.',
    rules: 'Reglas',
    settings: 'Ajustes',
    textSize: 'Tamaño del texto',
    textSizes: { normal: 'Normal', large: 'Grande', xlarge: 'Muy grande' },
    plainFont: 'Letra normal',
    plainFontHint: 'Usa una letra común en vez de la pixelada.',
    reduceMotion: 'Desactivar animaciones',
    reduceMotionHint: 'Las ventanas y cartas aparecen sin moverse.',
    close: 'Cerrar',
    toLight: 'Cambiar a modo claro',
    toDark: 'Cambiar a modo oscuro',
    language: 'Idioma',
    install: 'Instalar app',
    developedBy: 'Desarrollado por',
  },
}

export const LocaleContext = createContext<Locale>(defaultLocale)

export function useLocale(): Locale {
  return useContext(LocaleContext)
}

export function useMessages(): Messages {
  return messages[useLocale()]
}
