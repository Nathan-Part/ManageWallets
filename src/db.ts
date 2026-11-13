import Dexie, { type Table } from 'dexie'
import { todayISO } from './lib/dates'
import { dueDates } from './lib/recurring'

export type TxType = 'expense' | 'income'

export interface Category {
  id: string
  name: string
  icon: string
  type: TxType
}

export interface Transaction {
  id: string
  type: TxType
  /** Montant en centimes, toujours positif. */
  amount: number
  categoryId: string
  date: string
  note: string
  recurringId?: string
}

export interface Recurring {
  id: string
  type: TxType
  amount: number
  categoryId: string
  note: string
  day: number
  startDate: string
  lastDate?: string
  active: boolean
}

class WalletDB extends Dexie {
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  recurring!: Table<Recurring, string>

  constructor() {
    super('managewallets')
    this.version(1).stores({
      transactions: 'id, date, categoryId, recurringId',
      categories: 'id, type',
      recurring: 'id',
    })
    this.on('populate', (tx) => {
      tx.table('categories').bulkAdd(DEFAULT_CATEGORIES)
    })
  }
}

const cat = (id: string, name: string, icon: string, type: TxType): Category => ({ id, name, icon, type })

export const DEFAULT_CATEGORIES: Category[] = [
  cat('c-courses', 'Courses', '🛒', 'expense'),
  cat('c-logement', 'Logement', '🏠', 'expense'),
  cat('c-transport', 'Transport', '🚗', 'expense'),
  cat('c-restos', 'Restos & sorties', '🍽️', 'expense'),
  cat('c-abos', 'Abonnements', '📱', 'expense'),
  cat('c-sante', 'Santé', '💊', 'expense'),
  cat('c-shopping', 'Shopping', '🛍️', 'expense'),
  cat('c-loisirs', 'Loisirs', '🎮', 'expense'),
  cat('c-autre-d', 'Autre', '📦', 'expense'),
  cat('c-salaire', 'Salaire', '💼', 'income'),
  cat('c-freelance', 'Freelance', '💻', 'income'),
  cat('c-remb', 'Remboursement', '↩️', 'income'),
  cat('c-autre-r', 'Autre', '💰', 'income'),
]

export const db = new WalletDB()
export const newId = () => crypto.randomUUID()

/** Crée les opérations dues pour chaque règle récurrente. Idempotent (suivi via lastDate). */
export async function generateRecurring(today = todayISO()): Promise<void> {
  await db.transaction('rw', db.recurring, db.transactions, async () => {
    for (const rule of await db.recurring.toArray()) {
      const dates = dueDates(rule, today)
      if (!dates.length) continue
      await db.transactions.bulkAdd(
        dates.map((date) => ({
          id: newId(),
          type: rule.type,
          amount: rule.amount,
          categoryId: rule.categoryId,
          note: rule.note,
          date,
          recurringId: rule.id,
        })),
      )
      await db.recurring.update(rule.id, { lastDate: dates[dates.length - 1] })
    }
  })
}

export interface Backup {
  app: 'managewallets'
  version: 1
  exportedAt: string
  transactions: Transaction[]
  categories: Category[]
  recurring: Recurring[]
}

export async function exportBackup(): Promise<Backup> {
  const [transactions, categories, recurring] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.recurring.toArray(),
  ])
  return { app: 'managewallets', version: 1, exportedAt: new Date().toISOString(), transactions, categories, recurring }
}

/** Remplace toutes les données par celles de la sauvegarde. */
export async function importBackup(data: unknown): Promise<void> {
  const b = data as Partial<Backup>
  if (b?.app !== 'managewallets' || !Array.isArray(b.transactions) || !Array.isArray(b.categories) || !Array.isArray(b.recurring)) {
    throw new Error('Fichier de sauvegarde invalide')
  }
  await db.transaction('rw', db.transactions, db.categories, db.recurring, async () => {
    await Promise.all([db.transactions.clear(), db.categories.clear(), db.recurring.clear()])
    await db.categories.bulkAdd(b.categories!)
    await db.transactions.bulkAdd(b.transactions!)
    await db.recurring.bulkAdd(b.recurring!)
  })
}
