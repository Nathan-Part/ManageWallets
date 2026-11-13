import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db, type TxType } from '../db'
import { CategoryBars, MonthlyBars, type MonthPoint } from '../components/Charts'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { totals, useCategories } from '../hooks'
import { addMonths, monthOf } from '../lib/dates'
import { formatMoney } from '../lib/money'

const SPAN = 6

export function Stats({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const [type, setType] = useState<TxType>('expense')
  const cats = useCategories()
  const first = addMonths(month, -(SPAN - 1))
  const txs = useLiveQuery(
    () => db.transactions.where('date').between(`${first}-01`, `${month}-31`, true, true).toArray(),
    [first, month],
  )
  if (!txs) return null
  const points: MonthPoint[] = Array.from({ length: SPAN }, (_, i) => {
    const m = addMonths(first, i)
    const { income, expense } = totals(txs.filter((t) => monthOf(t.date) === m))
    return { month: m, income, expense }
  })
  const monthTxs = txs.filter((t) => monthOf(t.date) === month)
  const { income, expense, balance } = totals(monthTxs)
  const avg = Math.round(points.reduce((s, p) => s + p.expense, 0) / SPAN)
  return (
    <>
      <MonthSwitcher month={month} onChange={setMonth} />
      <div className="tiles">
        <div className="card tile"><span>Revenus</span><b>{formatMoney(income)}</b></div>
        <div className="card tile"><span>Dépenses</span><b>{formatMoney(expense)}</b></div>
        <div className="card tile"><span>Épargné</span><b>{balance < 0 ? '−' : ''}{formatMoney(Math.abs(balance))}</b></div>
        <div className="card tile"><span>Dépenses moy. / mois</span><b>{formatMoney(avg)}</b></div>
      </div>

      <section className="card">
        <h2 className="card-title">Évolution sur {SPAN} mois</h2>
        <MonthlyBars data={points} selected={month} />
      </section>

      <section className="card">
        <div className="section-head in-card">
          <h2 className="card-title">Par catégorie</h2>
          <div className="segmented small">
            {(['expense', 'income'] as const).map((t) => (
              <button key={t} className={type === t ? 'active' : ''} aria-pressed={type === t} onClick={() => setType(t)}>
                {t === 'expense' ? 'Dépenses' : 'Revenus'}
              </button>
            ))}
          </div>
        </div>
        <CategoryBars txs={monthTxs.filter((t) => t.type === type)} cats={cats} />
      </section>
    </>
  )
}
