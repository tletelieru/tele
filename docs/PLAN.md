# Plan de desarrollo — Tele

Tele contra bots, de 2 a 6 jugadores. Comparte con Carioca el solver de juegos (repartir una mano en tríos y escaleras con comodines). Tele va antes porque partir la mano completa es el caso simple.

## Stack

Igual que 7 de Trébol: **web en TypeScript**, PWA instalable, sin backend.

| Área | Elección |
| --- | --- |
| Monorepo | pnpm workspaces |
| Lenguaje | TypeScript estricto |
| Mesa, menús, puntaje | React 19 + Tailwind 4 |
| Build | Vite + vite-plugin-pwa |
| Tests | Vitest + fast-check |
| Bots | Web Worker, mismo contrato que 7 de Trébol |
| Online | Node + WebSockets, servidor autoritativo (fase futura) |

## Estructura

```
apps/
  client/        PWA: mesa, menús, audio
  sim/           CLI de self-play bot contra bot
packages/
  engine/        estado, acciones legales, puntaje. Puro, sin dependencias de UI
  bots/          fácil, medio, difícil
```

## Contrato del motor

```ts
createMatch(config: MatchConfig, seed: number): MatchState
legalActions(state: MatchState, seat: Seat): Action[]
applyAction(state: MatchState, action: Action): MatchState
viewFor(state: MatchState, seat: Seat): PlayerView
score(state: MatchState): Score
```

```ts
interface Bot {
  choose(view: PlayerView, legal: Action[], rng: Rng): Action
}
```

- Estado inmutable y serializable: sirve para guardar partida y para el servidor.
- RNG con semilla: toda partida se puede reproducir.
- Los bots reciben `PlayerView`, nunca `MatchState`. Así no pueden hacer trampa.

## Paleta

Terracota / naranjo: cálido y bien distinto de Carioca, aunque usen el mismo naipe. En modo oscuro las pintas rojas de mesa usan `#ff6b8a` para no confundirse con el acento.

| Var | Claro | Oscuro |
| --- | --- | --- |
| `--bg` | `#f2e4d6` | `#26160d` |
| `--surface` | `#fcf4ec` | `#362114` |
| `--raised` | `#e8d2bd` | `#4a2f1d` |
| `--ink` | `#2e1d12` | `#f7ece2` |
| `--muted` | `#6c5747` | `#c9b09c` |
| `--accent` | `#a8481a` | `#f08a4b` |
| `--on-accent` | `#ffffff` | `#1f1108` |
| `--gold` | `#7a5a0a` | `#e9c46a` |

## Fases

### 0. Base del repo
- Workspace pnpm, TS, ESLint, Vitest y CI (lint, typecheck, test, build) sobre PRs y pushes a `dev` y `main`. Pages se publica desde `main`.
- Cliente con el baseline ox: EN/ES, claro/oscuro, ícono, footer, ajustes de accesibilidad y la paleta de arriba.
- Mazo definido en `packages/engine/src/cards.ts` con test de cantidad y unicidad.
- En `ox-proxy/projects.json`: `"tele": { "port": 5188, "base": "/tele" }`.

Listo cuando: el link de `ox-test` abre el cliente y CI pasa.

### 1. Motor
- 2 naipes ingleses, 104 cartas, sin jokers. 12 cartas por jugador.
- Inicio de ronda: revolver, alzar, deslizar; la primera se quema al fondo y la segunda es el triunfo, siempre visible.
- Espejo: la otra carta idéntica al triunfo.
- Comodines: las 4 cartas del número siguiente y del color del triunfo (3♠ → 4♠ ×2 y 4♣ ×2; K → As).
- Tríos de 3+ de cualquier pinta; escaleras de 3+ de la misma pinta, el As entre K y 2 (dan la vuelta). Comodines en cualquier posición.
- Turno: primer jugador al azar, luego a la derecha. Se saca la última botada o la del mazo; en el primer turno el primero puede sacar el triunfo, que queda visible a su lado.
- Con 13 cartas: si 12 forman juegos se baja y tapa con la 13ª; si no, bota una.
- Mazo agotado: se revuelven las botadas y se desliza.
- Puntaje por ronda:

| Concepto | Puntos | Quién |
| --- | --- | --- |
| Bajarse | 3 | Quien se baja |
| Trío o escalera de 5 / 6 / 7… | n − 4 | Todos |
| Espejo | 1 | Todos |
| Cada comodín | 1 | Todos |

- Fin: meta configurable, 25 por defecto. Si varios la pasan en la misma ronda gana el mayor total; si empatan, el que se bajó.

Listo cuando, con tests de propiedades:
- Ninguna carta se pierde ni se duplica (manos + mazo + botadas + triunfo = 104).
- El solver acepta toda partición válida de 12 cartas y rechaza las inválidas.
- El puntaje de cada ronda cuadra con la tabla para todos los jugadores.

### 2. Bots y simulador
- Solver de juegos: mejor partición de la mano con comodines, y cuántas cartas faltan para bajarse.
- Fácil: se queda la carta que más acerca a bajarse.
- Medio: además cuida puntos (5+ iguales, espejo) y no bota lo que le sirve al de la derecha.
- Difícil: cuenta botadas y lo que tomó cada rival.

Listo cuando: `pnpm sim` muestra difícil > medio > fácil en N partidas.

### 3. Mesa
- Inicio: dificultad y cantidad de jugadores. Mesa, resultados, reglas, historial, guardar y retomar partida.
- Bots en Web Worker.

Listo cuando: se juega una partida completa en el celular.

### 4. Pulido
- Animaciones de reparto y movimiento de cartas, música chiptune, efectos, texto grande, letra normal, sin animaciones.

### 5. Publicación
- Pages desde `main`. En tletelieru pasa de `soon` a `live` en la sección Juegos.

## UI propia

- Mano de 12 con ordenar por número o pinta, arrastrar para reordenar y agrupar juegos.
- Triunfo, espejo y comodines marcados en la mano.

## Pendiente

- Empate entre dos que no se bajaron: propuesta, jugar otra ronda.
- Confirmar que el triunfo en mano no da punto por sí solo.
