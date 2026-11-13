import { describe, expect, it } from 'vitest'
import { dueDates } from './recurring'
import { parseAmount } from './money'
import { addMonths, dateInMonth } from './dates'

describe('parseAmount', () => {
  it('accepte virgule, point et espaces', () => {
    expect(parseAmount('12,50')).toBe(1250)
    expect(parseAmount('12.5')).toBe(1250)
    expect(parseAmount('1 200')).toBe(120000)
    expect(parseAmount('19,99')).toBe(1999)
  })
  it('refuse les valeurs invalides', () => {
    for (const v of ['', 'abc', '0', '-5', '1,234', '1.2.3']) expect(parseAmount(v)).toBeNull()
  })
})

describe('dates', () => {
  it('addMonths passe les années', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
  it('dateInMonth ramène à la fin du mois', () => {
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28')
    expect(dateInMonth('2028-02', 31)).toBe('2028-02-29')
  })
})

describe('dueDates', () => {
  const base = { day: 5, startDate: '2026-09-05', active: true }
  it('génère toutes les échéances passées', () => {
    expect(dueDates(base, '2026-11-13')).toEqual(['2026-09-05', '2026-10-05', '2026-11-05'])
  })
  it("ne génère pas l'échéance du mois si elle n'est pas encore arrivée", () => {
    expect(dueDates(base, '2026-11-04')).toEqual(['2026-09-05', '2026-10-05'])
  })
  it('reprend après lastDate sans doublon', () => {
    expect(dueDates({ ...base, lastDate: '2026-10-05' }, '2026-11-13')).toEqual(['2026-11-05'])
    expect(dueDates({ ...base, lastDate: '2026-11-05' }, '2026-11-13')).toEqual([])
  })
  it('ignore les échéances avant startDate et les règles en pause', () => {
    expect(dueDates({ day: 1, startDate: '2026-10-15', active: true }, '2026-11-13')).toEqual(['2026-11-01'])
    expect(dueDates({ ...base, active: false }, '2026-11-13')).toEqual([])
  })
  it('gère le 31 sur les mois courts', () => {
    expect(dueDates({ day: 31, startDate: '2026-01-31', active: true }, '2026-03-31')).toEqual([
      '2026-01-31', '2026-02-28', '2026-03-31',
    ])
  })
})
