export type Currency = 'EUR' | 'ILS'
export const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'ILS', symbol: '₪', label: 'Shekel' },
]

const KEY = 'managewallets.currency'
const isCurrency = (v: unknown): v is Currency => v === 'EUR' || v === 'ILS'

function load(): Currency {
  try {
    const v = localStorage.getItem(KEY)
    if (isCurrency(v)) return v
  } catch { /* stockage indisponible */ }
  return 'EUR'
}

let currency = load()
let fmt = makeFmt()
const listeners = new Set<() => void>()

function makeFmt() {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency })
}

export const getCurrency = () => currency
export const currencySymbol = () => CURRENCIES.find((c) => c.code === currency)!.symbol
export function subscribeCurrency(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
/** Change la devise d'affichage (aucune conversion des montants). */
export function setCurrency(c: unknown) {
  if (!isCurrency(c) || c === currency) return
  currency = c
  fmt = makeFmt()
  try { localStorage.setItem(KEY, c) } catch { /* ignoré */ }
  listeners.forEach((fn) => fn())
}

/** Les montants sont stockés en centimes (entiers) pour éviter les erreurs d'arrondi. */
export function formatMoney(cents: number): string {
  return fmt.format(cents / 100)
}

/** "12,50" | "12.5" | "1 200" -> centimes. null si invalide ou <= 0. */
export function parseAmount(input: string): number | null {
  const s = input.replace(/[\s  €₪]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null
  const cents = Math.round(parseFloat(s) * 100)
  return cents > 0 ? cents : null
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',').replace(/,00$/, '')
}
