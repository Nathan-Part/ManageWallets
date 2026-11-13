import { addMonths, dateInMonth, monthOf } from './dates'

export interface RecurringSchedule {
  /** Jour du mois souhaité (1-31), ramené à la fin du mois si besoin. */
  day: number
  startDate: string
  /** Date de la dernière opération déjà générée. */
  lastDate?: string
  active: boolean
}

/** Dates des opérations à générer : après lastDate, à partir de startDate, jusqu'à today inclus. */
export function dueDates(rule: RecurringSchedule, today: string): string[] {
  if (!rule.active) return []
  const out: string[] = []
  const end = monthOf(today)
  for (let m = monthOf(rule.lastDate ?? rule.startDate); m <= end; m = addMonths(m, 1)) {
    const date = dateInMonth(m, rule.day)
    if (date < rule.startDate || date > today) continue
    if (rule.lastDate && date <= rule.lastDate) continue
    out.push(date)
  }
  return out
}
