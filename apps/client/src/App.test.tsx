import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('switches language', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    await userEvent.click(screen.getByRole('button', { name: 'ES' }))
    expect(screen.getByText("Bájate con las 12 cartas en tríos y escaleras, contra bots.")).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'EN' }))
    expect(screen.getByText("Go out with all 12 cards in trios and runs, against bots.")).toBeTruthy()
  })

  it('toggles dark mode', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    await userEvent.click(screen.getByRole('button', { name: /dark mode|modo oscuro/i }))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('color-mode')).toBe('dark')
  })

  it('opens settings as a modal and closes it from outside', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    await userEvent.click(screen.getByTestId('overlay-backdrop'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the rules from the start screen and from settings', async () => {
    localStorage.setItem('preferred-lang', 'en')
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Rules' }))
    const rules = screen.getByRole('dialog', { name: 'Rules' })
    await userEvent.click(within(rules).getByRole('button', { name: "Sets" }))
    expect(screen.getByText("Trios: 3 or more cards of the same number, any suit.")).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const settings = screen.getByRole('dialog', { name: 'Settings' })
    await userEvent.click(within(settings).getByRole('button', { name: 'Rules' }))
    expect(screen.getByRole('dialog', { name: 'Rules' })).toBeTruthy()
  })

  it('switches to the plain font', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /plain font|letra normal/i }))
    expect(document.documentElement.classList.contains('plain-font')).toBe(true)
    expect(localStorage.getItem('plain-font')).toBe('on')
  })

  it('scales the text and turns animations off', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: /settings|ajustes/i }))
    await userEvent.click(screen.getByRole('button', { name: /extra large|muy grande/i }))
    expect(document.documentElement.style.fontSize).toBe('130%')
    await userEvent.click(screen.getByRole('checkbox', { name: /animations|animaciones/i }))
    expect(document.documentElement.classList.contains('reduce-motion')).toBe(true)
  })
})
