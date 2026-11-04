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

### 1. Motor — listo
- 2 naipes ingleses, 104 cartas, sin jokers. 12 cartas por jugador.
- Inicio de ronda: revolver, alzar, deslizar; la primera se quema al fondo y la segunda es el triunfo, siempre visible.
- Espejo: la otra carta idéntica al triunfo.
- Comodines: las 4 cartas del número siguiente y del color del triunfo (3♠ → 4♠ ×2 y 4♣ ×2; K → As).
- Tríos de 3+ de cualquier pinta; escaleras de 3+ de la misma pinta, el As entre K y 2 (dan la vuelta). Comodines en cualquier posición.
- Turno: se sortea quién da y parte el de su derecha; luego a la derecha. Cada ronda da el siguiente a la derecha. Se saca la última botada o la del mazo; en el primer turno el primero puede sacar el triunfo, que queda visible a su lado.
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

### 2. Bots y simulador — listo
- Solver de juegos: mejor partición de la mano con comodines, y cuántas cartas faltan para bajarse.
- Fácil: se queda la carta que más acerca a bajarse.
- Medio: además cuida puntos (5+ iguales, espejo) y no bota lo que le sirve al de la derecha.
- Difícil: cuenta botadas y lo que tomó cada rival.

Listo cuando: `pnpm sim` muestra difícil > medio > fácil en N partidas.

Resultado (4 jugadores, a 25): medio vs fácil 56,7% (300 partidas), difícil vs fácil 59,0% (200), difícil vs medio 27,7% ±5,1 (300; parejo sería 25%). La ventaja de difícil sobre medio es chica y está cerca del margen de error.

### 3. Mesa — listo
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

## Decisiones de las fases 1 a 3

- **Solver** (`packages/engine/src/melds.ts`, reutilizable para Carioca). Cuenta cartas por pinta y número, trata los comodines como libres y recorre la mano desde la carta más baja: trío con las cartas de su mismo número o escalera desde ella, con vuelta por el As. Con eso se sabe si 12 cartas se bajan (`canPartition`, `fullPartition`), la mejor partición para puntuar (`bestPartition`), con qué cartas se puede tapar (`coverOptions`) y cuántas cartas faltan para bajarse (`distance`). Resuelve una mano en ~0,1 ms y guarda resultados en caché, así que corre en el worker sin problema.
- Los tests del solver lo comparan contra una fuerza bruta por subconjuntos en manos válidas construidas a mano y en manos rotas o al azar.
- Puntaje del que se baja: la mejor partición completa de sus 12 cartas. El resto: la mejor partición parcial. La carta con que se tapa no cuenta.
- Bajarse es opcional: se puede botar aunque las 12 formen juegos.
- Quién da se sortea con la semilla; parte el de la derecha del que da. Cada ronda nueva da el siguiente a la derecha.
- Espejo botado: no va a las botadas, queda sobre el triunfo (un poco girado). Solo el siguiente jugador puede sacarlo en su turno; si no lo saca, ahí se queda el resto de la ronda.
- Mazo agotado: se revuelven todas las botadas menos la de arriba y se desliza; la de arriba se puede seguir sacando.
- La carta quemada va al fondo del mazo, boca abajo. El triunfo que nadie saca queda en la mesa toda la ronda.
- El mazo se muestra deslizado: una fila de dorsos que se acorta a medida que se saca.
- En el primer turno, si el primero saca el triunfo, todos ven que lo tiene (aparece junto a su nombre) hasta que lo bote.
- Toques en dos pasos, sin ventana de tiempo: el primer toque levanta la carta (o la de arriba del mazo, las botadas o el espejo sobre el triunfo) y el segundo la bota o la saca. Tocar otra carta mueve la selección; tocar fuera la limpia.
- Barra fija sobre la mano solo con Bajarse (después se elige la carta para tapar); siempre visible, se apaga cuando no se puede usar. Sacar y botar son solo los dos toques.
- Cuando alguien saca el triunfo, la carta viaja hasta el lado de su nombre y el lugar del triunfo queda vacío. La línea de comodín y espejo se mantiene.
- Ayudas solo en fácil: agrupar juegos en la mano, ordenar por juegos y marcar con qué carta tapar. En medio y difícil "Bajarse" siempre está disponible; si la carta elegida no deja 12 en juegos se avisa "Esas cartas no forman juegos" sin castigo. Triunfo, espejo y comodines se marcan siempre porque son públicos.
- Bots: fácil minimiza las cartas que le faltan y se equivoca un 30% de las veces; medio suma puntos (comodines, espejo, juegos de 5+), cartas conectadas y no le bota al de la derecha lo que ha estado recogiendo; difícil además cuenta botadas y lo que tomó cada rival para calcular cuántas cartas vivas le sirven.
- Bots difícil vs medio: el conteo de cartas vivas se usa solo para desempatar entre descartes que dejan la mano a la misma distancia (a 1 o 2 cartas de bajarse). Como bono sumado empeoraba al bot porque cambiaba distancia por "outs". La defensa contra todos los rivales también empeoraba y se dejó solo contra el de la derecha.
- Partida nueva: sorteo de quién da (foco que salta de jugador en jugador ~2 s, luego "Da: X" 0,8 s, después el reparto). Tras el reparto, el mazo se desliza al centro, se quema una carta (se ve pasar al final del deslizado) y la siguiente se da vuelta y va al lugar del triunfo. Las partidas restauradas no lo muestran; con animaciones desactivadas se muestra el resultado de inmediato.
- Fin de ronda: la carta tapada vuela a las botadas, se muestran los juegos del que se bajó uno a uno, después las manos del resto, y recién ahí se abre el resumen con un jingle alegre si sumaste al menos tanto como el mejor rival (o te bajaste).
- Música propia de Tele (tema de inicio, tema de mesa y una variante cuando alguien está a 5 puntos de la meta) y sonidos por acción, con un interruptor en ajustes. Los temas dependen de la configuración (inicio de partida, ronda nueva, salida) y los sonidos de las acciones; nada se dispara desde efectos que miran el estado.
- Reglas ilustradas con cartas de ejemplo: mazo deslizado con triunfo, espejo, comodines, tríos, escaleras (también con vuelta), comodín en un juego, bajarse tapando y juegos de 5+.

## Pendiente

- Empate entre dos que no se bajaron: implementado como otra ronda; falta confirmarlo.
- Confirmar que el triunfo en mano no da punto por sí solo (implementado así).
- Confirmar si bajarse es obligatorio cuando se puede.
