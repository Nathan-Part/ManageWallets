const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })

/** Les montants sont stockés en centimes (entiers) pour éviter les erreurs d'arrondi. */
export function formatMoney(cents: number): string {
  return fmt.format(cents / 100)
}

/** "12,50" | "12.5" | "1 200" -> centimes. null si invalide ou <= 0. */
export function parseAmount(input: string): number | null {
  const s = input.replace(/[\s  €]/g, '').replace(',', '.')
  if (!/^\d+(\.\d{0,2})?$/.test(s)) return null
  const cents = Math.round(parseFloat(s) * 100)
  return cents > 0 ? cents : null
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',').replace(/,00$/, '')
}
