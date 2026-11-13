import type { Transaction } from '../db'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { TransactionList } from '../components/TransactionList'
import { totals, useCategories, useMonthTransactions } from '../hooks'
import { formatMoney } from '../lib/money'

export function Home({ month, setMonth, onEdit, onSeeAll, onAdd }: {
  month: string
  setMonth: (m: string) => void
  onEdit: (tx: Transaction) => void
  onSeeAll: () => void
  onAdd: () => void
}) {
  const txs = useMonthTransactions(month)
  const cats = useCategories()
  if (!txs) return null
  const { income, expense, balance } = totals(txs)
  const recent = [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
  return (
    <>
      <MonthSwitcher month={month} onChange={setMonth} />
      <section className="hero card">
        <span className="hero-label">Solde du mois</span>
        <span className="hero-value">{balance < 0 ? '−' : ''}{formatMoney(Math.abs(balance))}</span>
        <div className="hero-split">
          <div><span className="hero-label">Revenus</span><b className="amount income">+{formatMoney(income)}</b></div>
          <div><span className="hero-label">Dépenses</span><b>−{formatMoney(expense)}</b></div>
        </div>
        {income > 0 && (
          <div className="bar-track" title="Part des revenus dépensée">
            <div className={`bar-fill ${expense > income ? 'over' : ''}`} style={{ width: `${Math.min(100, (expense / income) * 100)}%` }} />
          </div>
        )}
        {income > 0 && (
          <span className="hero-hint">
            {expense > income
              ? `⚠️ Tu as dépensé ${formatMoney(expense - income)} de plus que tes revenus`
              : `${Math.round((expense / income) * 100)} % de tes revenus dépensés`}
          </span>
        )}
      </section>

      <div className="section-head">
        <h2>Dernières opérations</h2>
        {txs.length > 5 && <button className="link" onClick={onSeeAll}>Tout voir</button>}
      </div>
      {recent.length ? (
        <TransactionList txs={recent} cats={cats} onEdit={onEdit} grouped={false} />
      ) : (
        <div className="card empty-card">
          <p>Aucune opération ce mois-ci.</p>
          <button className="btn primary" onClick={onAdd}>Ajouter une opération</button>
        </div>
      )}
    </>
  )
}
