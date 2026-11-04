import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import { sameCard } from '@tele/engine'
import type { Action, Card } from '@tele/engine'
import { useMessages } from '../i18n/messages'
import { SORT_MODES, cardKey, cardLabel, cardMark, meldGroups, moveItem, sortHand } from '../lib/cards'
import type { SortMode } from '../lib/cards'
import { readSortMode, sortModeKey } from '../lib/settings'
import { MiniCard } from './MiniCard'

interface Props {
  header: ReactNode
  actions: ReactNode
  selected: Card | null
  onSelect: (card: Card | null) => void
  hand: Card[]
  trump: Card
  legal: Action[]
  dealing: boolean
  concealed: boolean
  coverMode: boolean
  hints: boolean
  onDiscard: (card: Card) => void
  onCover: (card: Card) => void
}

interface Drag {
  key: string
  element: HTMLButtonElement
  startX: number
  startY: number
  grabX: number
  grabY: number
  x: number
  y: number
  moved: boolean
}

const DRAG_THRESHOLD = 6
const CARD_REM = 4.375
const SLOT_REM = 2.875
const GAP_REM = 0.125
const MAX_CARDS = 13
const MELD_COLORS = 5

function isReducedMotion(): boolean {
  return document.documentElement.classList.contains('reduce-motion')
}

function cardState(picked: boolean, cover: boolean, dimmed: boolean, fresh: boolean): string {
  const classes = [picked && 'is-picked', cover && 'is-cover', dimmed && 'is-dimmed', fresh && 'is-new']
  return classes.filter(Boolean).join(' ')
}

export function Hand({
  header,
  actions,
  selected,
  onSelect,
  hand,
  trump,
  legal,
  dealing,
  concealed,
  coverMode,
  hints,
  onDiscard,
  onCover,
}: Props) {
  const t = useMessages()
  const modes = hints ? SORT_MODES : SORT_MODES.filter((mode) => mode !== 'sets')
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const saved = readSortMode()
    return modes.includes(saved) ? saved : 'suit'
  })
  const [order, setOrder] = useState(() => sortHand(hand, sortMode, trump).map(cardKey))
  const [dragging, setDragging] = useState<string | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const dragged = useRef(false)
  const slots = useRef(new Map<string, { left: number; top: number }>())

  const known = order.flatMap((key) => hand.filter((card) => cardKey(card) === key))
  const unordered = hand.filter((card) => !order.includes(cardKey(card)))
  const fresh = hand.length > MAX_CARDS - 1 ? unordered : []
  const cards = [...known, ...unordered]
  const keys = cards.map(cardKey)
  const groups = hints ? meldGroups(hand, trump) : new Map<string, number>()
  const isDiscardable = (card: Card) =>
    legal.some((action) => action.type === 'discard' && sameCard(action.card, card))
  const isCover = (card: Card) =>
    !hints || legal.some((action) => action.type === 'goOut' && sameCard(action.cover, card))
  const canAct = coverMode || legal.some((action) => action.type === 'discard')

  const applySort = (mode: SortMode) => {
    localStorage.setItem(sortModeKey, mode)
    setSortMode(mode)
    setOrder(sortHand(hand, mode, trump).map(cardKey))
  }

  const place = useCallback(() => {
    const current = drag.current
    const box = grid.current?.getBoundingClientRect()
    if (!current?.moved || !box) return
    const x = current.x - current.grabX - box.left - current.element.offsetLeft
    const y = current.y - current.grabY - box.top - current.element.offsetTop
    current.element.style.translate = `${x}px ${y}px`
  }, [])

  // eslint-disable-next-line local/no-effect -- measures the DOM to reserve room for every row of cards
  useLayoutEffect(() => {
    const reserve = () => {
      const element = grid.current
      if (!element) return
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const perRow = Math.max(1, Math.floor((element.clientWidth + GAP_REM * rem) / (SLOT_REM * rem)))
      const rows = Math.ceil(MAX_CARDS / perRow)
      element.style.minHeight = `${rows * CARD_REM + (rows - 1) * GAP_REM}rem`
    }
    reserve()
    window.addEventListener('resize', reserve)
    return () => window.removeEventListener('resize', reserve)
  })

  // eslint-disable-next-line local/no-effect -- animates the DOM card positions after the order changes
  useLayoutEffect(() => {
    place()
    const buttons = grid.current?.querySelectorAll<HTMLButtonElement>('[data-card]') ?? []
    const next = new Map<string, { left: number; top: number }>()
    buttons.forEach((button) => {
      const key = button.dataset.card!
      const slot = { left: button.offsetLeft, top: button.offsetTop }
      const previous = slots.current.get(key)
      next.set(key, slot)
      if (!previous || key === drag.current?.key) return
      const x = previous.left - slot.left
      const y = previous.top - slot.top
      if ((x === 0 && y === 0) || isReducedMotion()) return
      button.animate?.([{ translate: `${x}px ${y}px` }, { translate: '0 0' }], {
        duration: 160,
        easing: 'ease-out',
      })
    })
    slots.current = next
  }, [order, hand.length, place])

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, key: string) => {
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    element.setPointerCapture?.(event.pointerId)
    dragged.current = false
    drag.current = {
      key,
      element,
      startX: event.clientX,
      startY: event.clientY,
      grabX: event.clientX - rect.left,
      grabY: event.clientY - rect.top,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current
    if (!current) return
    current.x = event.clientX
    current.y = event.clientY
    if (!current.moved) {
      const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY)
      if (distance < DRAG_THRESHOLD) return
      current.moved = true
      setDragging(current.key)
    }
    place()
    const box = grid.current?.getBoundingClientRect()
    if (!box) return
    const x = event.clientX - box.left
    const y = event.clientY - box.top
    const from = keys.indexOf(current.key)
    const buttons = grid.current?.querySelectorAll<HTMLButtonElement>('[data-card]') ?? []
    for (const [to, button] of [...buttons].entries()) {
      const key = button.dataset.card!
      if (key === current.key) continue
      const { offsetLeft: left, offsetTop: top, offsetWidth: width, offsetHeight: height } = button
      const inside = x >= left && x <= left + width && y >= top && y <= top + height
      if (!inside) continue
      const sameRow = top === current.element.offsetTop
      const center = left + width / 2
      const crossed = !sameRow || (to > from ? x >= center : x <= center)
      if (crossed) setOrder(moveItem(keys, from, keys.indexOf(key)))
      break
    }
  }

  const onPointerEnd = () => {
    const current = drag.current
    drag.current = null
    if (!current?.moved) return
    dragged.current = true
    const landing = current.element.style.translate
    current.element.style.translate = ''
    if (isReducedMotion()) {
      setDragging(null)
      return
    }
    current.element.animate?.([{ translate: landing }, { translate: '0 0' }], {
      duration: 140,
      easing: 'ease-out',
    })
    setDragging(null)
  }

  const onCard = (card: Card) => {
    if (dragged.current) {
      dragged.current = false
      return
    }
    if (coverMode) {
      if (isCover(card)) onCover(card)
      return
    }
    if (!isDiscardable(card)) return
    if (selected === null || !sameCard(selected, card)) return onSelect(card)
    onSelect(null)
    setOrder(keys.filter((item) => item !== cardKey(card)))
    onDiscard(card)
  }

  return (
    <section aria-label={t.yourHand} className="flex w-full flex-col items-center gap-1.5">
      <div className="flex w-full items-center justify-between gap-2">
        {header}
        <div role="group" aria-label={t.sortBy} className="flex items-center gap-1 text-xs">
        <span className="text-muted">{t.sortBy}</span>
        {modes.map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={sortMode === mode}
            onClick={() => applySort(mode)}
            className={`pixel-box px-2 py-1 font-medium ${sortMode === mode ? 'bg-accent text-on-accent' : 'bg-raised'}`}
          >
            {t.sortModes[mode]}
          </button>
        ))}
        </div>
      </div>
      {actions}
      <div
        ref={grid}
        className={`relative flex w-full flex-wrap content-start justify-center gap-0.5 ${concealed ? 'concealed' : ''}`}
      >
        {cards.map((card, index) => {
          const key = cardKey(card)
          const usable = coverMode ? isCover(card) : isDiscardable(card)
          const picked = !coverMode && selected !== null && sameCard(selected, card)
          const group = groups.get(key)
          const mark = cardMark(card, trump)
          const stagger = { '--delay': `${index * 30}ms` } as CSSProperties
          const label = [cardLabel(card), mark && t.marks[mark]].filter(Boolean).join(', ')
          return (
            <button
              key={key}
              type="button"
              data-card={key}
              style={stagger}
              aria-disabled={!usable}
              aria-pressed={picked}
              aria-label={label}
              onPointerDown={(event) => onPointerDown(event, key)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onClick={() => onCard(card)}
              className={`hand-card ${cardState(picked, hints && coverMode && usable, canAct && !usable, fresh.includes(card))} ${
                dragging === key ? 'is-dragging' : ''
              }`}
            >
              <span className={`block ${dealing ? 'deal-in' : ''}`}>
                <MiniCard card={card} highlight={picked} mark={mark} />
                <span
                  aria-hidden="true"
                  className={`meld-bar ${group === undefined ? 'invisible' : `meld-${group % MELD_COLORS}`}`}
                />
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
