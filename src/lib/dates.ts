// Dates manipulées comme chaînes locales 'YYYY-MM-DD' et mois 'YYYY-MM' (pas de fuseau horaire).
const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const todayISO = () => toISO(new Date())
export const monthOf = (date: string) => date.slice(0, 7)

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

export function lastDayOfMonth(month: string): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Date du mois donné pour un jour souhaité, ramené au dernier jour si le mois est plus court. */
export function dateInMonth(month: string, day: number): string {
  return `${month}-${pad(Math.min(day, lastDayOfMonth(month)))}`
}

const parse = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d ?? 1)
}

export function monthLabel(month: string): string {
  const s = parse(`${month}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
export function monthShort(month: string): string {
  return parse(`${month}-01`).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
}
export function dayLabel(date: string): string {
  const today = todayISO()
  if (date === today) return "Aujourd'hui"
  const y = new Date()
  y.setDate(y.getDate() - 1)
  if (date === toISO(y)) return 'Hier'
  return parse(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}
