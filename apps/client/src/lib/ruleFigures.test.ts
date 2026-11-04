import { describe, expect, it } from 'vitest'
import { meldKind, wildSpec } from '@tele/engine'
import type { Card } from '@tele/engine'
import { rulesText } from '../i18n/rules'
import { RULE_FIGURES } from './ruleFigures'

const TRUMP: Card = { rank: 3, suit: 'spades', copy: 0 }

describe('rule figures', () => {
  it('lines up with the rules in every language', () => {
    for (const text of Object.values(rulesText)) {
      text.sections.forEach((section, index) => {
        expect(RULE_FIGURES[index]).toHaveLength(section.rules.length)
      })
    }
  })

  it('shows valid sets in the set examples', () => {
    const spec = wildSpec(TRUMP)
    for (const group of RULE_FIGURES[1].flatMap((figure) => figure?.groups ?? [])) {
      expect(meldKind(group.map((item) => item.card!), spec)).not.toBeNull()
    }
    const out = RULE_FIGURES[2][2]!.groups
    out.slice(0, 4).forEach((group) => expect(meldKind(group.map((item) => item.card!), spec)).not.toBeNull())
    expect(out[4][0].card).toBeNull()
  })
})
