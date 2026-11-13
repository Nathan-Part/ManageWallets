import type { Category, Transaction } from '../db'
import { dayLabel } from '../lib/dates'
import { formatMoney } from '../lib/money'

export function TxRow({ tx, cat, onClick }: { tx: Transaction; cat?: Category; onClick: () => void }) {
  const title = tx.note || cat?.name || 'Sans catégorie'
  return (
    <button className="row" onClick={onClick}>
      <span className="row-icon" aria-hidden>{cat?.icon ?? '❔'}</span>
      <span className="row-main">
        <span className="row-title">{title}</span>
        <span className="row-sub">
          {cat?.name ?? 'Sans catégorie'}
          {tx.recurringId && ' · 🔁 récurrent'}
        </span>
      </span>
      <span className={`amount ${tx.type}`}>
        {tx.type === 'income' ? '+' : '−'}
        {formatMoney(tx.amount)}
      </span>
    </button>
  )
}

export function TransactionList({
  txs, cats, onEdit, grouped = true,
}: {
  txs: Transaction[]
  cats: Map<string, Category>
  onEdit: (tx: Transaction) => void
  grouped?: boolean
}) {
  const sorted = [...txs].sort((a, b) => b.date.localeCompare(a.date))
  if (!grouped) {
    return (
      <div className="card list">
        {sorted.map((t) => <TxRow key={t.id} tx={t} cat={cats.get(t.categoryId)} onClick={() => onEdit(t)} />)}
      </div>
    )
  }
  const groups = new Map<string, Transaction[]>()
  for (const t of sorted) groups.set(t.date, [...(groups.get(t.date) ?? []), t])
  return (
    <>
      {[...groups].map(([date, items]) => (
        <section key={date}>
          <h3 className="group-title">{dayLabel(date)}</h3>
          <div className="card list">
            {items.map((t) => <TxRow key={t.id} tx={t} cat={cats.get(t.categoryId)} onClick={() => onEdit(t)} />)}
          </div>
        </section>
      ))}
    </>
  )
}
