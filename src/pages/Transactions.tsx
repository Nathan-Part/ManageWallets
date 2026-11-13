import { useState } from 'react'
import type { Transaction, TxType } from '../db'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { TransactionList } from '../components/TransactionList'
import { useCategories, useMonthTransactions } from '../hooks'

const FILTERS: { key: TxType | 'all'; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'expense', label: 'Dépenses' },
  { key: 'income', label: 'Revenus' },
]

export function Transactions({ month, setMonth, onEdit }: {
  month: string
  setMonth: (m: string) => void
  onEdit: (tx: Transaction) => void
}) {
  const [filter, setFilter] = useState<TxType | 'all'>('all')
  const [query, setQuery] = useState('')
  const txs = useMonthTransactions(month)
  const cats = useCategories()
  if (!txs) return null
  const q = query.trim().toLowerCase()
  const shown = txs.filter((t) => {
    if (filter !== 'all' && t.type !== filter) return false
    if (!q) return true
    return t.note.toLowerCase().includes(q) || (cats.get(t.categoryId)?.name.toLowerCase().includes(q) ?? false)
  })
  return (
    <>
      <MonthSwitcher month={month} onChange={setMonth} />
      <div className="segmented">
        {FILTERS.map((f) => (
          <button key={f.key} className={filter === f.key ? 'active' : ''} aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>
      <input className="search" type="search" placeholder="Rechercher…" aria-label="Rechercher"
        value={query} onChange={(e) => setQuery(e.target.value)} />
      {shown.length
        ? <TransactionList txs={shown} cats={cats} onEdit={onEdit} />
        : <p className="empty">Aucune opération.</p>}
    </>
  )
}
