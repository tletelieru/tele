import type { Locale } from './locales'

interface RuleSection {
  tab: string
  rules: string[]
}

interface RulesText {
  sections: RuleSection[]
}

export const rulesText: Record<Locale, RulesText> = {
  en: {
    sections: [
      {
        tab: "Basics",
        rules: [
          "Two standard 52-card decks, 104 cards. 2 to 6 players, 12 cards each.",
          "Shuffle, cut and slide. The first card is burned to the bottom and the second is the trump.",
          "The mirror is the other card identical to the trump.",
          "Wild cards are the 4 cards of the next number in the trump color. With 3♠: 4♠ ×2 and 4♣ ×2. With a King, the Aces.",
        ],
      },
      {
        tab: "Sets",
        rules: [
          "Trios: 3 or more cards of the same number, any suit.",
          "Runs: 3 or more cards in a row of the same suit. The Ace goes between the King and the 2, so runs wrap around.",
          "Wild cards fit in any position.",
        ],
      },
      {
        tab: "Turn",
        rules: [
          "The dealer is drawn at random. The player to the dealer's right starts, then turns go to the right. Each round the deal moves one seat to the right.",
          "Take the last discarded card or the top of the deck. On the first turn, the first player may take the trump.",
          "With 13 cards: if 12 form sets, go out and cover with the 13th. If not, discard one.",
          "If the deck runs out, the discards are shuffled and slid.",
          "Whoever discards the mirror leaves it on the trump. Only the next player may take it; if not, it stays there.",
        ],
      },
      {
        tab: "Points",
        rules: [
          "Going out: 3 points. The round ends.",
          "Everyone scores what they hold: mirror 1, each wild card 1. The trump itself scores nothing.",
          "Trios and runs of 5 or more: 1 point per card past the fourth.",
          "First to the target, usually 25, wins. If several pass it, highest total wins; on a tie, whoever went out.",
          "If the tied leaders did not go out, another round is played.",
        ],
      },
    ],
  },
  es: {
    sections: [
      {
        tab: "Base",
        rules: [
          "Dos naipes ingleses, 104 cartas. De 2 a 6 jugadores, 12 cartas cada uno.",
          "Se revuelve, se alza y se desliza. La primera se quema al fondo y la segunda es el triunfo.",
          "El espejo es la otra carta idéntica al triunfo.",
          "Los comodines son las 4 cartas del número siguiente y del color del triunfo. Con 3♠: 4♠ ×2 y 4♣ ×2. Con K, los As.",
        ],
      },
      {
        tab: "Juegos",
        rules: [
          "Tríos: 3 o más cartas del mismo número, de cualquier pinta.",
          "Escaleras: 3 o más cartas seguidas de la misma pinta. El As va entre el K y el 2, así que dan la vuelta.",
          "Los comodines van en cualquier posición.",
        ],
      },
      {
        tab: "Turno",
        rules: [
          "Se sortea quién da. Parte el de la derecha del que da y después sigue el de la derecha. Cada ronda da el siguiente a la derecha.",
          "Sacas la última carta botada o la de arriba del mazo. En el primer turno, el primero puede sacar el triunfo.",
          "Con 13 cartas: si 12 forman juegos, te bajas y tapas con la 13ª. Si no, botas una.",
          "Si se acaba el mazo, se revuelven las botadas y se desliza.",
          "Quien bota el espejo lo deja sobre el triunfo. Solo el siguiente puede sacarlo; si no, ahí se queda.",
        ],
      },
      {
        tab: "Puntos",
        rules: [
          "Bajarse: 3 puntos. Ahí termina la ronda.",
          "Todos suman lo que tienen: espejo 1, cada comodín 1. El triunfo por sí solo no suma.",
          "Tríos y escaleras de 5 o más: 1 punto por cada carta sobre la cuarta.",
          "Gana el primero en llegar a la meta, usualmente 25. Si varios la pasan, gana el de mayor total; si empatan, el que se bajó.",
          "Si los empatados no se bajaron, se juega otra ronda.",
        ],
      },
    ],
  },
}
