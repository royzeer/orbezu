// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { TokenDiff, Line } from '../components/ui.jsx'
import { compare } from '../lib/compare.js'
import Account from '../pages/Account.jsx'
import { LESSON } from '../data/lessons.js'

afterEach(cleanup)

describe('TokenDiff', () => {
  it('marca en rojo la palabra que faltó', () => {
    const r = compare('They open at seven.', 'they open seven', 'en')
    render(<TokenDiff result={r} lang="en" />)
    expect(screen.getByText('at')).toHaveClass('tok-miss')
    expect(screen.getByText(/open/)).toHaveClass('tok-ok')
  })
})

describe('Line', () => {
  it('muestra la traducción solo al tocar la frase', () => {
    const line = LESSON['ja-bakery'].sentence
    render(<Line line={line} lang="ja" />)
    expect(screen.queryByText(line.tr)).toBeNull()
    expect(screen.getByText(line.rom)).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Toca para ver la traducción'))
    expect(screen.getByText(line.tr)).toBeInTheDocument()
  })
})

describe('Account', () => {
  it('sin servidor configurado muestra el modo invitado', () => {
    render(<Account />)
    expect(screen.getByText('Modo invitado')).toBeInTheDocument()
  })
})
