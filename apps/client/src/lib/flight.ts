const FLIGHT_MS = 420

function reducedMotion(): boolean {
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  return media || document.documentElement.classList.contains('reduce-motion')
}

function ease(t: number): number {
  return 1 - (1 - t) ** 3
}

export interface Grabbed {
  ghost: HTMLElement
  from: DOMRect
  size: DOMRect
}

export function grabCard(look: Element | null, from?: DOMRect): Grabbed | null {
  if (!look || typeof look.animate !== 'function' || reducedMotion()) return null
  const size = look.getBoundingClientRect()
  const start = from ?? size
  const ghost = look.cloneNode(true) as HTMLElement
  for (const node of [ghost, ...ghost.querySelectorAll('*')]) {
    for (const name of node.getAttributeNames()) if (name.startsWith('data-')) node.removeAttribute(name)
  }
  ghost.setAttribute('aria-hidden', 'true')
  Object.assign(ghost.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${size.width}px`,
    height: `${size.height}px`,
    margin: '0',
    rotate: 'none',
    translate: 'none',
    transformOrigin: 'center',
    zIndex: '50',
    pointerEvents: 'none',
    visibility: 'visible',
  })
  document.body.append(ghost)
  const grabbed = { ghost, from: start, size }
  place(grabbed, start, 0)
  return grabbed
}

function place({ ghost, from, size }: Grabbed, to: DOMRect, t: number) {
  const x = from.left + from.width / 2 + (to.left + to.width / 2 - from.left - from.width / 2) * t
  const y = from.top + from.height / 2 + (to.top + to.height / 2 - from.top - from.height / 2) * t
  const scale = (from.width + (to.width - from.width) * t) / size.width
  ghost.style.transform = `translate(${x - size.width / 2}px, ${y - size.height / 2}px) scale(${scale})`
}

export function flyTo(grabbed: Grabbed | null, target: HTMLElement | null) {
  if (!grabbed) return
  if (!target) {
    grabbed.ghost.remove()
    return
  }
  target.style.visibility = 'hidden'
  const started = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - started) / FLIGHT_MS)
    if (!target.isConnected || t >= 1) {
      target.style.visibility = ''
      grabbed.ghost.remove()
      return
    }
    place(grabbed, target.getBoundingClientRect(), ease(t))
    requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
