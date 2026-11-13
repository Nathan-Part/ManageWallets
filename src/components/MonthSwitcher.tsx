import { addMonths, monthLabel, monthOf, todayISO } from '../lib/dates'

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const current = monthOf(todayISO())
  return (
    <div className="month-switcher">
      <button className="icon-btn" aria-label="Mois précédent" onClick={() => onChange(addMonths(month, -1))}>‹</button>
      <button className="month-label" onClick={() => onChange(current)} title="Revenir au mois en cours">
        {monthLabel(month)}
      </button>
      <button className="icon-btn" aria-label="Mois suivant" onClick={() => onChange(addMonths(month, 1))}>›</button>
    </div>
  )
}
