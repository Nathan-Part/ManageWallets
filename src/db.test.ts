import { describe, expect, it } from 'vitest'
import { isValidDate, sanitizeBackup } from './db'

const valid = {
  app: 'managewallets',
  version: 1,
  currency: 'ILS',
  categories: [
    { id: 'c-courses', name: 'Courses', icon: '🛒', type: 'expense' },
    { id: 'c-salaire', name: 'Salaire', icon: '💼', type: 'income' },
  ],
  transactions: [{ id: 'a1', type: 'expense', amount: 1250, categoryId: 'c-courses', date: '2026-11-02', note: 'Pain' }],
  recurring: [{ id: 'r1', type: 'income', amount: 200000, categoryId: 'c-salaire', note: '', day: 1, startDate: '2026-01-01', active: true }],
}

describe('isValidDate', () => {
  it('accepte une vraie date entre 2000 et 2100', () => {
    expect(isValidDate('2026-02-28')).toBe(true)
    expect(isValidDate('2024-02-29')).toBe(true)
  })
  it('refuse les dates impossibles, hors bornes ou mal formées', () => {
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('0001-01-01')).toBe(false)
    expect(isValidDate('2026-1-1')).toBe(false)
    expect(isValidDate(20260101)).toBe(false)
  })
})

describe('sanitizeBackup', () => {
  it('conserve une sauvegarde valide', () => {
    const b = sanitizeBackup(valid)
    expect(b.transactions).toEqual(valid.transactions)
    expect(b.recurring).toEqual(valid.recurring)
    expect(b.categories).toEqual(valid.categories)
    expect(b.currency).toBe('ILS')
  })

  it('refuse un fichier qui n’est pas une sauvegarde', () => {
    expect(() => sanitizeBackup(null)).toThrow()
    expect(() => sanitizeBackup({ app: 'autre', transactions: [], categories: [], recurring: [] })).toThrow()
    expect(() => sanitizeBackup({ ...valid, transactions: 'x' })).toThrow()
  })

  it('ignore les enregistrements invalides', () => {
    const b = sanitizeBackup({
      ...valid,
      transactions: [
        ...valid.transactions,
        { id: 'a2', type: 'expense', amount: '12', categoryId: 'c-courses', date: '2026-11-02' },
        { id: 'a3', type: 'expense', amount: -5, categoryId: 'c-courses', date: '2026-11-02' },
        { id: 'a4', type: 'expense', amount: Infinity, categoryId: 'c-courses', date: '2026-11-02' },
        { id: 'a5', type: 'vol', amount: 100, categoryId: 'c-courses', date: '2026-11-02' },
        { id: 'a6', type: 'expense', amount: 100, categoryId: 'c-courses', date: 'demain' },
        { id: { x: 1 }, type: 'expense', amount: 100, categoryId: 'c-courses', date: '2026-11-02' },
        null,
      ],
      recurring: [
        // date de départ trop ancienne : génèrerait des milliers d'opérations
        { id: 'r2', type: 'expense', amount: 100, categoryId: 'c-courses', day: 1, startDate: '0001-01-01', active: true },
        { id: 'r3', type: 'expense', amount: 100, categoryId: 'c-courses', day: 45, startDate: '2026-01-01', active: true },
      ],
    })
    expect(b.transactions.map((t) => t.id)).toEqual(['a1'])
    expect(b.recurring).toEqual([])
  })

  it('tronque les textes, dédoublonne les identifiants et retire les champs inconnus', () => {
    const b = sanitizeBackup({
      ...valid,
      transactions: [
        { ...valid.transactions[0], note: 'x'.repeat(500), extra: '<script>' },
        { ...valid.transactions[0], amount: 99 },
      ],
    })
    expect(b.transactions).toHaveLength(1)
    expect(b.transactions[0].note).toHaveLength(80)
    expect(b.transactions[0]).not.toHaveProperty('extra')
    expect(b.transactions[0].amount).toBe(1250)
  })

  it('garde au moins une catégorie de chaque type', () => {
    const b = sanitizeBackup({ ...valid, categories: [] })
    expect(b.categories.some((c) => c.type === 'expense')).toBe(true)
    expect(b.categories.some((c) => c.type === 'income')).toBe(true)
  })
})
