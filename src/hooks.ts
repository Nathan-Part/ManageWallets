import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db, type Category, type Transaction } from './db'

export function useCategories(): Map<string, Category> {
  const list = useLiveQuery(() => db.categories.toArray(), [])
  return useMemo(() => new Map((list ?? []).map((c) => [c.id, c])), [list])
}

export function useMonthTransactions(month: string): Transaction[] | undefined {
  return useLiveQuery(
    () => db.transactions.where('date').between(`${month}-01`, `${month}-31`, true, true).toArray(),
    [month],
  )
}

export function totals(txs: Transaction[]) {
  let income = 0
  let expense = 0
  for (const t of txs) t.type === 'income' ? (income += t.amount) : (expense += t.amount)
  return { income, expense, balance: income - expense }
}
